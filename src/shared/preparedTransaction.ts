import { Oracle } from '../oracle';
import { ProposedTransaction, MsigTransferProposal } from '../types';

/**
 * 
 * @param name - имя из ethEvent
 * @param amount - сумма из ethEvent
 * @param transactionHash - ... из ethEvent
 * @param blockNumber  - ... из ethEvent
 * @param self - оракл
 * @param time - текущий таймстамп(с сайта worldtime)
 * @param proposal_name - имя, сгенированное из номера блока, константы и logIndex 
 */
export async function createTrx(name: string, amount: string, transactionHash: string, self: Oracle, time: number, proposal_name: string): Promise<ProposedTransaction> {
  const actions = [
    {
      account: self.eosContract,
      name: 'transfer',
      authorization: [{
        actor: 'eosio.prods',
        permission: 'active'
      }],
      data: {
        transaction_hash: transactionHash,
        to: name,
        proposal_name,
        amount: `${amount} BET`,
      }
    }
  ];
  const seActions = await self.eosApi.serializeActions(actions);
  return {
    expiration: new Date(time + 3600000).toISOString().split('.')[0],
    ref_block_num: 0,
    ref_block_prefix: 0,
    max_net_usage_words: 0,
    max_cpu_usage_ms: 0,
    delay_sec: 0,
    context_free_actions: [],
    actions: [
      {
        account: self.eosContract,
        name: 'transfer',
        authorization: [{
          actor: 'eosio.prods',
          permission: 'active'
        }],
        data: seActions[0].data
      }
    ],
    transaction_extensions: []
  }
}

/**
 * 
 * создает транзакцию по данным eth и делает ее propose в eosio.msig (одновременно добавляя иноформацию о ней в proposals bridgeContract)
 */
export async function proposeTransfer({ proposer, name, amount, transactionHash, self, requested, uniqueName, time }: MsigTransferProposal): Promise<any> {
  const trx: ProposedTransaction = await createTrx(name, amount, transactionHash, self, time, uniqueName);
  return self.eosApi.transact({
    actions: [{
      account: self.eosContract,
      name: 'addproposal',
      authorization: [{
        actor: proposer,
        permission: 'active'
      }],
      data: {
        proposer,
        proposal_name: uniqueName,
        transaction_hash: transactionHash
      }
    }, {
      account: 'eosio.msig',
      name: 'propose',
      authorization: [{
        actor: proposer,
        permission: 'active'
      }],
      data: {
        proposer: proposer,
        proposal_name: uniqueName,
        requested,
        trx
      }
    }]
  },
    {
      broadcast: true,
      sign: true,
      blocksBehind: 3,
      expireSeconds: 3600
    }
  )
}

export function approve({ proposal_name, proposer, actor, api, proposal_hash }:
  { proposal_name: string, proposer: string, actor: string, api: any, proposal_hash: string }): Promise<any> {
  return api.transact({
    actions: [{
      account: 'eosio.msig',
      name: 'approve',
      authorization: [{
        actor,
        permission: 'active'
      }],
      data: {
        proposer,
        proposal_name,
        level: { actor, permission: 'active' },
        proposal_hash
      }
    },]
  },
    {
      broadcast: true,
      sign: true,
      blocksBehind: 3,
      expireSeconds: 3600
    })
}

export function unApprove({ proposal_name, proposer, actor, api }:
  { proposal_name: string, proposer: string, actor: string, api: any }): Promise<any> {
  return api.transact({
    actions: [{
      account: 'eosio.msig',
      name: 'unapprove',
      authorization: [{
        actor,
        permission: 'active'
      }],
      data: {
        proposer,
        proposal_name,
        level: { actor, permission: 'active' }
      }
    },]
  },
    {
      broadcast: true,
      sign: true,
      blocksBehind: 3,
      expireSeconds: 3600
    })
}

export async function execTransfer(proposer: string, executer: string, proposedName: string, api: any): Promise<any> {
  return api.transact({
    actions: [{
      account: 'eosio.msig',
      name: 'exec',
      authorization: [{
        actor: executer,
        permission: 'active'
      }],
      data: {
        proposer,
        proposal_name: proposedName,
        executer
      }
    },]
  },
    {
      broadcast: true,
      sign: true,
      blocksBehind: 3,
      expireSeconds: 3600
    })
}

export async function cancelProposal(proposer: string, proposedName: string, api: any): Promise<any> {
  return api.transact({
    actions: [{
      account: 'eosio.msig',
      name: 'cancel',
      authorization: [{
        actor: proposer,
        permission: 'active'
      }],
      data: {
        proposer: proposer,
        proposal_name: proposedName,
        canceler: proposer
      }
    },]
  },
    {
      broadcast: true,
      sign: true,
      blocksBehind: 3,
      expireSeconds: 3600
    }
  );
}
