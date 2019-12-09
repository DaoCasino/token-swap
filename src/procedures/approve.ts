import { approve } from '../shared/preparedTransaction'
import { getOneApproval, getOneProposal } from '../shared/eosTablesQuery';
import { getUnpackedTransaction, formatString } from '../shared/utils';
import { CustomProposals, ApprovalItem, ApprovalWithCustomProposalInfo, ValidationInfo, ValidationInfoWithEthEvent } from '../types';
import { Oracle } from '../oracle';
import { DELIMITER } from '../shared/constants';
import { EventLog } from 'web3/types';
const ecc = require('eosjs-ecc')

/**
 * 
 * @param self - оракл
 * @param proposed - данные из таблицы proposals bridgeContract
 * @param approvalsWithProposalInfo - данные из таблицы approvals eosio.msig c добавлением имени пропоузера 
 */
export async function doApproves(self: Oracle, proposed: CustomProposals[], approvalsWithProposalInfo: ApprovalWithCustomProposalInfo[]): Promise<string[]> {
  const toValidate: ValidationInfo[] = await getProposalsToApprove(approvalsWithProposalInfo, self);
  if (!toValidate.length) {
    return !proposed.length ? [] : [...Array(proposed.length).keys()].map(() => 'Unapproved: absent in eosio.msig or does not fit custom proposal table');
  }
  return validate(toValidate, self);
}
/**
 * 
 * @param toValidate - массив объектов из proposer, proposal_name, transactionHash и распокованной транзакции
 * @param self - оракл
 * 1. Из эфировских эвентов отыскиваются подходящие по хешу и производится сравнение данных.
 */
async function validate(toValidate: ValidationInfo[], self: Oracle) {
  try {
    const toCheckProposes = toValidate.map((proposal: any) => {
      const ethValues = self.ethEvents.filter((event: any) => formatString(event.transactionHash) === formatString(`0x${proposal.transactionHash}`));
      return { ...proposal, ethValues };
    });

    const checkedPromises = toCheckProposes.map(async (validationInfoWithEthEvent: ValidationInfoWithEthEvent) => {
      if (!validationInfoWithEthEvent.ethValues.length) {
        return `Unapproved by transactionHash: ${validationInfoWithEthEvent.proposer} - ${validationInfoWithEthEvent.proposal_name}
         ${validationInfoWithEthEvent.transactionHash}`;
      }

      const { amount: inEthAmount, accountName: inEthName } = validationInfoWithEthEvent.ethValues[0].returnValues;
      const { to, amount } = validationInfoWithEthEvent.proposal.actions[0].data;
      const { proposal_hash } = validationInfoWithEthEvent;
      const ethValue = (parseFloat(inEthAmount) / DELIMITER).toFixed(4);
      const eosValue = parseFloat(amount).toFixed(4);
      const isValidated = (to === inEthName && ethValue === eosValue);
      return isValidated ? wrappedApprove(validationInfoWithEthEvent, self, eosValue, to, proposal_hash)
        : `Unapproved: ${validationInfoWithEthEvent.proposer}-${validationInfoWithEthEvent.proposal_name}: ${eosValue} to ${to} when event is ${JSON.stringify(validationInfoWithEthEvent.ethValues[0].returnValues)} to ${inEthName} in ${validationInfoWithEthEvent.transactionHash}`
    });
    return Promise.all(checkedPromises);
  } catch (err) { self.logger.info(JSON.stringify(err)); return Promise.resolve([]) };
}

/**
 * 
 * @param wrappedApprovals - структура из таблицы approvals + proposal_name + proposer 
 * @param self
 * 1. Вычисляются approvals, где валидатор еще в requested
 * 2. распакоывается транзакция и производися проверка по количетсву actions(одно), наличию необходимых полей, контракту, имени actiona,
 * формату ассета ({float fixed до 4 знаков} BET).
 */
async function getProposalsToApprove(wrappedApprovals: ApprovalWithCustomProposalInfo[], self: Oracle): Promise<ValidationInfo[]> {
  const wrappedRequestedApprovals = wrappedApprovals.filter(({ approval }) => {
    return approval && !!approval.requested_approvals.filter((requestedApproval: ApprovalItem) => {
      return requestedApproval.level.actor === self.accountName;
    }
    ).length;
  });
  const proposalsToApprove = await wrappedRequestedApprovals.reduce(async (acc: Promise<ValidationInfo[]>, requested: ApprovalWithCustomProposalInfo) => {
    const { proposal_name, proposer } = requested;
    const accumulator = await acc;
    const res = await getOneProposal(self, proposer, proposal_name);
    if (res.rows && res.rows.length) {
      try {
        const proposal_hash = ecc.sha256(Buffer.from(res.rows[0].packed_transaction, 'hex'));
        const proposal = await getUnpackedTransaction(res.rows[0].packed_transaction, self.eosApi);
        if (
          proposal
          && proposal.expiration
          && Array.isArray(proposal.actions)
          && proposal.actions.length === 1
          && Array.isArray(proposal.actions[0].authorization)
          && proposal.actions[0].authorization.length === 1
          && proposal.actions[0].authorization[0].actor === 'eosio.prods'
          && proposal.actions[0].name === 'transfer'
          && proposal.actions[0].account === self.eosContract
          && proposal.actions[0].data
          && Object.keys(proposal.actions[0].data).length == 4
          && proposal.actions[0].data.transaction_hash
          && proposal.actions[0].data.to
          && proposal.actions[0].data.amount
          && proposal.actions[0].data.amount.match(/^([0-9]+[.])[0-9]{4}\sBET$/g)
          && proposal.actions[0].data.proposal_name === proposal_name
        ) {
          accumulator.push({ proposal, proposal_name, transactionHash: proposal.actions[0].data.transaction_hash, proposer, proposal_hash });
        } else {
          self.logger.info(`\r\n${proposer}-${proposal_name}: WRONG FORMAT PROPOSAL: ${JSON.stringify(proposal)}\r\n`);
        }
      } catch (err) {
        self.logger.info(JSON.stringify(err))
      }
    }
    return Promise.resolve([...accumulator]);
  }, Promise.resolve([]));
  return proposalsToApprove;
}

async function wrappedApprove(valInf: ValidationInfoWithEthEvent, self: Oracle, eosValue: string, to: string, proposal_hash: string): Promise<string> {
  try {
    const res = await approve({ proposer: valInf.proposer, proposal_name: valInf.proposal_name, actor: self.accountName, api: self.eosApi, proposal_hash });
    return Promise.resolve(`Approved ${eosValue} to ${to}: ${valInf.proposer} - ${valInf.proposal_name}: ${res}`);
  } catch (err) { return `approve: ${err.json ? err.json.error.details[0].message : err}`; }
}

/**
 * 
 * @param proposed - proposals from bridgeContract
 * @param self 
 * 1. получаются proposals из eosio.msig
 * 2. К ним добавляется имя пропоузера.
 */
export function addApprovalToCustomProposal(proposed: CustomProposals[], self: Oracle): Promise<ApprovalWithCustomProposalInfo[]> {
  const approvalsPromises = proposed.map(async (customProposal: CustomProposals) => {
    const {
      proposal_name,
      proposer,
    } = customProposal;
    const res = await getOneApproval(self, proposer, proposal_name);
    return {
      proposal_name,
      proposer,
      approval: res.rows[0],
    }
  });
  return Promise.all(approvalsPromises)
}