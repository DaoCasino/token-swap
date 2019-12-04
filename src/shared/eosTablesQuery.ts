import {getEncodedName} from './utils';
import {Oracle} from '../oracle';
import {Proposal, Approval, CustomProposals, CustomTransaction} from '../types'

export async function getAllMsigProposals(self: Oracle, scope: string): Promise<{rows: Proposal[]}> {
  let more = true;
  let returned: any = [];
  let lower_bound = 0;
  while(more) {
    const res = await self.eosRpc.get_table_rows({
      json: true,
      code: 'eosio.msig',
      scope,
      table: 'proposal',
      lower_bound,
      upper_bound : -1,
      limit: -1,
      key_type: 'i64',
      index_position: 1
    });
    returned = returned.concat(res.rows)
    lower_bound = res.more ? getEncodedName(res.rows[res.rows.length - 1].proposal_name).toString() : 0;
    more = res.more;
  }
  return {rows: returned};
}

export function getOneProposal(self: Oracle, scope: string, name?: string): Promise<{rows: Proposal[]}> {
  return self.eosRpc.get_table_rows({
    json: true,
    code: 'eosio.msig',
    scope,
    table: 'proposal',
    lower_bound: name ? getEncodedName(name).toString() : 0,
    upper_bound : name ? getEncodedName(name).plus(1).toString() : - 1,
    limit: -1,
    key_type: 'i64',
    index_position: 1
  });
}

export async function getTransactions(self: Oracle): Promise<CustomTransaction[]> {
  let returned: any = [];
  let upper_bound = -1;
  let more = true;
  const lower_bound = self.doneTransactions.length ? Math.max(...self.doneTransactions.map((trx: any) => parseInt(trx.key))) + 1 : 0;
  while(more) {
    const res = await self.eosRpc.get_table_rows({
      json: true,
      code: self.eosContract,
      scope: self.eosContract,
      table: 'transactions',
      lower_bound,
      upper_bound,
      limit: -1,
      reverse: true,
      key_type: 'i64',
      index_position: 1
    });
    returned = returned.concat(res.rows)
    more = res.more;
    upper_bound = more ? res.rows[res.rows.length - 1].key - 1 : 0;
  }
  return returned;
}

export async function getInitialTransactions(self: Oracle): Promise<CustomTransaction[]>{
  let returned: any = [];
  let lower_bound = 0;
  let more = true;
  try {
    while(more) {
      const res = await self.eosRpc.get_table_rows({
        json: true,
        code: self.eosContract,
        scope: self.eosContract,
        table: 'transactions',
        lower_bound,
        limit: -1,
        key_type: 'i64',
        index_position: 1
      });
      returned = returned.concat(res.rows);
      more = res.more;
      lower_bound = more ? res.rows[res.rows.length - 1].key + 1 : 0;
    } 
  }catch(err) {self.logger.info(err)}
  return returned;
}

export async function getAllProposers(self: Oracle, hash?: string): Promise<CustomProposals[]> {
  let returned: any = [];
  let lower_bound = 0;
  let more = true;
  try {
    while(more) {
      const res = await self.eosRpc.get_table_rows({
        json: true,
        code: self.eosContract,
        scope: self.eosContract,
        table: 'proposals',
        lower_bound,
        limit: -1,
        key_type: 'i64',
        index_position: 1
      });
      returned = returned.concat(res.rows);
      more = res.more;
      lower_bound = more ? Math.max(...res.rows.map((prop: any) => parseInt(prop.key))) + 1 : 0;
    }
  }catch(err) {self.logger.info(err)}
  
  return returned;
}

export async function getAllCustomProposals(self: Oracle): Promise<{rows: CustomProposals[]}> {
  let more = true;
  let returned: any = [];
  let lower_bound = 0;
  try {
    while(more) {
      const res = await self.eosRpc.get_table_rows({
        json: true,
        code: self.eosContract,
        scope: self.eosContract,
        table: 'proposals',
        lower_bound: lower_bound,
        upper_bound: -1,
        limit: -1,
        key_type: 'i64',
        index_position: 2
      });
      lower_bound = res.more ? res.rows[res.rows.length - 1].key : 0;
      returned = returned.concat(res.rows)
      more = res.more;
    }
  }catch(err) {self.logger.info(err)}
  return {rows: returned};
}

export async function getCustomProposals(self: Oracle, name: string): Promise<{rows: CustomProposals[]}> {
  return await self.eosRpc.get_table_rows({
    json: true,
    code: self.eosContract,
    scope: self.eosContract,
    table: 'proposals',
    lower_bound: getEncodedName(name).toString(),
    upper_bound: getEncodedName(name).plus(1).toString(),
    limit: -1,
    key_type: 'i64',
    index_position: 3
  });
}

export async function getOneApproval(self: Oracle, scope: string, name: string): Promise<{rows: Approval[]}>{
  return await self.eosRpc.get_table_rows({
      json: true,
      code: 'eosio.msig',
      scope,
      table: 'approvals2',
      lower_bound: getEncodedName(name).toString(),
      upper_bound : getEncodedName(name).plus(1).toString(),
      limit: -1,
      key_type: 'i64',
      index_position: 1
    });
}