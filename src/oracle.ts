import Web3 from 'web3';
import abiArrayListener from "./artifacts/Bridge.json";
import { Api, JsonRpc } from 'eosjs';
import { getAllProposers, getTransactions, getInitialTransactions } from './shared/eosTablesQuery';
import { getApi, sleep, getLogger, formatHashToEos, formatString, getUniqueProposalName } from './shared/utils';
import { doProposals } from './procedures/propose';
import { doApproves, addApprovalToCustomProposal } from './procedures/approve';
import { doCancels } from './procedures/cancel';
import { doExecs } from './procedures/exec';
import { CustomProposals, BridgeData, Permission, Account, AccountPermission, CustomTransaction, BridgeReturnData } from './types';
import Contract from 'web3/eth/contract';
import { EventLog } from 'web3/types';
export const fetch = require('node-fetch').default;
import { SLEEP, MAX_PROPOSALS, DELIMITER, ATTEMPTS_TO_APPROVE, BLOCK_TO_NAME_OFFSET, TIME_TO_REPEAT_PROPOSAL } from './shared/constants';

export class Oracle {
  public web3: Web3;
  public contract: Contract;
  public eosApi: Api;
  public eosRpc: JsonRpc;
  public ethereumAPI: string;
  public ethContractAddress: string;
  public multiSig: string;
  public permission: string;
  public accountName: string;
  public threshold: number;
  public eosContract: string;
  public doneTransactions: CustomTransaction[] = [];
  public ethEvents: EventLog[];
  public logger = getLogger();
  public timeOffset: number = 0;
  private attemptsToApprove: number;
  private clockApi: string;
  private blocksBehind: number = 0;
  private latestBlock: number = 0;
  private finishBlock: number = 0;
  constructor(
    multiSig: string,
    permission: string,
    accountName: string,
    eosKeyProvider: string[],
    eosNet: string,
    eosChainId: string,
    ethNet: string,
    ethContractAddress: string,
    eosContract: string,
    clockApi: string,
    blocksBehind: number
  ) {
    this.web3 = new Web3(ethNet);
    this.ethereumAPI = ethNet;
    this.ethContractAddress = ethContractAddress
    this.contract = new this.web3.eth.Contract(abiArrayListener.abi, ethContractAddress);
    const { eosApi, eosRpc } = getApi(eosKeyProvider, eosNet, eosChainId);
    this.eosApi = eosApi;
    this.eosRpc = eosRpc;
    this.accountName = accountName;
    this.attemptsToApprove = ATTEMPTS_TO_APPROVE;
    this.multiSig = multiSig;
    this.permission = permission;
    this.eosContract = eosContract;
    this.getTwoTypesofProposals = this.getTwoTypesofProposals.bind(this);
    this.clockApi = clockApi;
    this.ethEvents = [];
    this.threshold = 0;
    this.blocksBehind = blocksBehind;
  }

  public getTwoTypesofProposals(customProposals: CustomProposals[], currentTimestamp: number): { eventsToPropose: BridgeData[], alreadyTransactedHashes: string[] } {
    const alreadyTransactedHashes: string[] = this.doneTransactions.map((trx: CustomTransaction) => formatString(trx.transaction_hash));
    const eventsToPropose: BridgeData[] = this.ethEvents.reduce((data: BridgeData[], event: EventLog) => {
      const { transactionHash, blockNumber, logIndex, returnValues: { accountName: eosAccName, amount } } = event;
      if (alreadyTransactedHashes.indexOf(formatHashToEos(transactionHash)) === -1
        && !customProposals.filter((alprop: CustomProposals) => {
          return (currentTimestamp - new Date(alprop.timestamp).getTime() + this.timeOffset) < TIME_TO_REPEAT_PROPOSAL && alprop.proposal_name === getUniqueProposalName(`${blockNumber}${BLOCK_TO_NAME_OFFSET}${logIndex}`);
        }).length) {
        data.push({ transactionHash: formatHashToEos(transactionHash), blockNumber, logIndex, eosAccName, amount: (parseFloat(amount) / DELIMITER).toFixed(4) })
      }
      return data;
    }, []);
    return { eventsToPropose: eventsToPropose.slice(0, MAX_PROPOSALS), alreadyTransactedHashes }
  }

  public async getRequested(): Promise<AccountPermission[]> {
    const { permissions }: { permissions: Permission[] } = await this.eosRpc.get_account('eosio.prods');
    const required_auth = permissions.filter(({ perm_name }: { perm_name: string }) => perm_name === this.permission)[0].required_auth;
    this.threshold = required_auth.threshold;
    return required_auth.accounts.map((acc: Account): AccountPermission => acc.permission);
  }

  public async startApproving(cycleBegin: number) {
    this.finishBlock = await this.web3.eth.getBlockNumber();
    let requested: AccountPermission[] = [];
    while (true) {
      if (!this.attemptsToApprove) {
        await sleep(15 * SLEEP);
        continue;
      }

      try {
        requested = await this.getRequested();
      }
      catch (err) {
        this.logger.info(JSON.stringify(err));
        await sleep(60 * SLEEP);
        continue;
      }

      if (requested.map((perm: AccountPermission) => perm.actor).indexOf(this.accountName) === -1) {
        await sleep(300 * SLEEP);
        continue;
      }
      try {
        const res = await this.makeBridgeProposesApprovalsAndCancels(requested);
        const isFinish: boolean =
          !res.eventsToPropose.length
          && !res.retCancels.length
          && !res.retExecs.length && !res.retProposals.length
          && !res.alreadyProposed.length && !res.retApproves.length
          && this.finishBlock < this.latestBlock;

        if (!res.eventsToPropose.length && !res.retCancels.length
          && !res.retExecs.length && !res.retProposals.length
          && (res.alreadyProposed.length && res.alreadyProposed.length <= res.retApproves.filter((appr: string) => appr.indexOf('Unapproved') !== -1).length)) {
          await sleep(30 * SLEEP);
        };

        const results = Object.keys(res).map((log: string) => {
          return `${log}: ${res[log] ? JSON.stringify(res[log]) : 'n/a'}`;
        });
        this.logger.info(`${results}, ${Date.now() - cycleBegin} ms`);
        if (isFinish) {
          this.attemptsToApprove--;
          this.logger.info(`Attempts remain: ${this.attemptsToApprove}`);
          await sleep(15 * SLEEP);
        }
      }
      catch (err) {
        this.logger.info(`${err}`);
        continue;
      }
    }
  }

  public async start(cycleBegin: number) {
    console.log('---Oracle has been launched!---')
    this.doneTransactions = await getInitialTransactions(this);
    this.startApproving(cycleBegin);
    this.contract.events.Swap({})
      .on('data', async () => {
        this.finishBlock = await this.web3.eth.getBlockNumber();
        this.attemptsToApprove = ATTEMPTS_TO_APPROVE;
      })
      .on('error', (err) => {
        this.logger.info(err);
      });

    setInterval(() => {
      this.web3 = new Web3(this.ethereumAPI)
      this.contract = new this.web3.eth.Contract(abiArrayListener.abi, this.ethContractAddress);
      this.attemptsToApprove = ATTEMPTS_TO_APPROVE
    }, 50 * 60 * 1000)
  }


  public async getTime(): Promise<number> {
    const res = await fetch(this.clockApi);
    const time = await res.json();
    return new Date(time.utc_datetime).getTime();
  }


  public async makeBridgeProposesApprovalsAndCancels(requested: { actor: string, permission: string }[]): Promise<BridgeReturnData> {
    const [passedTransactions, time, latestBlock]: [CustomTransaction[], number, number] = await Promise.all([
      getTransactions(this),
      this.getTime(),
      this.web3.eth.getBlockNumber()
    ]);
    this.doneTransactions = this.doneTransactions.concat(passedTransactions);
    const fromBlock = this.ethEvents.length ? Math.max(...this.ethEvents.map((ev: EventLog) => ev.blockNumber)) : 0;
    this.logger.info(`Getting eth events from block ${fromBlock}`);
    const [events, alreadyProposed]: [EventLog[], CustomProposals[]] = await Promise.all([
      this.contract.getPastEvents('Swap', { fromBlock: fromBlock + 1, toBlock: latestBlock - this.blocksBehind }),
      getAllProposers(this)
    ]);
    this.latestBlock = latestBlock - this.blocksBehind;
    this.ethEvents = this.ethEvents.concat(events);
    const { eventsToPropose, alreadyTransactedHashes } = this.getTwoTypesofProposals(alreadyProposed, time);
    const approvalsTable = await addApprovalToCustomProposal(alreadyProposed, this);
    const selfProposalsQuantity = alreadyProposed.filter(({ proposer }: { proposer: string }) => proposer === this.accountName).length;

    const proposals = (selfProposalsQuantity < MAX_PROPOSALS) ?
      doProposals(this, eventsToPropose.slice(0, MAX_PROPOSALS - selfProposalsQuantity), this.accountName, requested, time)
      : Promise.resolve([`Limit of ${MAX_PROPOSALS} is reached`]);
    const approves = doApproves(this, alreadyProposed, approvalsTable);
    const cancels = doCancels(this, alreadyProposed, this.accountName, alreadyTransactedHashes, time);
    const execs = doExecs(this, approvalsTable);

    const [retProposals, retApproves, retCancels, retExecs]: [string[], string[], string[], string[]] =
      await Promise.all([proposals, approves, cancels, execs]);
    return { eventsToPropose, alreadyProposed, retProposals, retApproves, retCancels, retExecs };
  }
}
