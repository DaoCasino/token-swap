import {cancelProposal} from '../shared/preparedTransaction'
import {getAllMsigProposals} from '../shared/eosTablesQuery';
import {getUnpackedTransaction} from '../shared/utils';
import {CustomProposals, Proposal, ProposedTransaction} from '../types'
import {Oracle} from '../oracle';
import { promises } from 'dns';

/**
 * 
 * @param self 
 * @param alreadyProposed - proposals bridgeContract 
 * @param myName - имя валидатора
 * @param alreadyTransactedHashes - хеши прошедших транзакций 
 * @param time - текущий таймстамп
 */
export async function doCancels(self: Oracle, alreadyProposed: CustomProposals[], myName: string, alreadyTransactedHashes: string[], time: number): Promise<string[]> {
  const proposals: {rows: Proposal[]} =  await getAllMsigProposals(self, myName);
  const unpackedTransactions: {unpackedTransaction: ProposedTransaction | null, proposal_name: string}[]  = await getUnpackedTransactionPromises(proposals, self);
  const cancelPromises = getCancelPromises(unpackedTransactions, alreadyProposed, myName, self, alreadyTransactedHashes, time);
  return Promise.all(cancelPromises);
}

/**
 * 
 * @param proposals - proposals eosio.msig для распаковки
 * @param self 
 */
function getUnpackedTransactionPromises(proposals: {rows: Proposal[]}, self: Oracle): Promise<{unpackedTransaction: ProposedTransaction | null, proposal_name: string}[]> {
  const unpackedTransactionsPromises = proposals.rows.map(async ({packed_transaction, proposal_name}: {packed_transaction: string, proposal_name: string}) => {
    try {
      const unpackedTransaction: ProposedTransaction = await getUnpackedTransaction(packed_transaction, self.eosApi)
      return {unpackedTransaction, proposal_name};
    } catch(err) {
      self.logger.info(JSON.stringify(err))};
      return {unpackedTransaction: null, proposal_name}
  });
  return Promise.all(unpackedTransactionsPromises)
}

/**
 * 
 * @param unpackedTransactions - распакованная транзакция
 * @param alreadyProposed - proposals bridgeContract 
 * @param myName - имя валидатора
 * @param self - оракл
 * @param alreadyTransactedHashes - хеши прошедших транзакций
 * @param time - текущий таймстамп
 */
function getCancelPromises(unpackedTransactions: {unpackedTransaction: ProposedTransaction | null, proposal_name: string}[], alreadyProposed: CustomProposals[],
  myName: string, self: Oracle, alreadyTransactedHashes: string[], time: number): Promise<string>[] {
  const cancelPromises =  
  unpackedTransactions.reduce((cancelList: Promise<string>[], unpackedTrxWithProposal: {unpackedTransaction: ProposedTransaction | null,  proposal_name: string}) => {
    const {unpackedTransaction, proposal_name} = unpackedTrxWithProposal;
    if (isTransactionToCancel(proposal_name, unpackedTransaction, alreadyProposed,  myName, self, alreadyTransactedHashes, time)) {
      cancelList.push((async() => {
        try {
          await cancelProposal(myName, proposal_name, self.eosApi);
          return `Canceled ${unpackedTransaction ? unpackedTransaction.actions[0].data.transaction_hash : 'Failed to unpack'}`;
        }catch(err) {return `cancel: ${err.json ? err.json.error.details[0].message : err}`};
      })());
    }
    return cancelList;
  }, []);
  return cancelPromises;
}

/**
 * @param proposal_name
 * @param unpackedTransaction 
 * @param alreadyProposed - proposals bridgeContract 
 * @param myName - имя валидатора
 * @param self 
 * @param alreadyTransactedHashes - прошедшие транзакции
 * @param time - текущий таймстап
 * удаляет proposals, которые уже есть в таблицах contractBridge
 * удаляет устаревшие
 * удаляет которые невозможно распаковать
 */
function isTransactionToCancel(proposal_name: string, unpackedTransaction: ProposedTransaction | null, alreadyProposed: CustomProposals[], 
  myName: string, self: Oracle, alreadyTransactedHashes: string[], time: number) {
  return unpackedTransaction
         && unpackedTransaction.actions
         && unpackedTransaction.actions.length
         && unpackedTransaction.actions[0].data
         && unpackedTransaction.actions[0].account 
         && (!!alreadyProposed.filter((alprop) => {
           return (unpackedTransaction.actions[0].account === self.eosContract
           && alprop.proposal_name === proposal_name
           && alprop.proposer.toLowerCase() !== myName.toLowerCase());
  }).length
  || alreadyTransactedHashes.indexOf(unpackedTransaction.actions[0].data.transaction_hash.toLowerCase()) !== -1
  || time > (new Date(unpackedTransaction.expiration).getTime() - self.timeOffset)
  || unpackedTransaction === null
  );
}