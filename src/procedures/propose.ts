import {proposeTransfer} from '../shared/preparedTransaction'
import {getUniqueProposalName} from '../shared/utils';
import {Oracle} from '../oracle';
import {BridgeData, EventWithUniqueProposalName} from '../types';
import {BLOCK_TO_NAME_OFFSET} from '../shared/constants';

/**
 * 
 * @param self - оракл
 * @param eventsToPropose - еще не предложенные эвенты 
 * @param proposer - валидатор, запускающий скрипт
 * @param requested - список валидаторов
 * @param time - время с сайта worldclockapi
 * делает пропоузал с данными из эвента
 */

export async function doProposals(self: Oracle, eventsToPropose: BridgeData[], proposer: string, requested: {actor: string, permission: string}[], time: number): Promise<string[]> {

  const uniqueNamesWithEvents: EventWithUniqueProposalName[] = eventsToPropose.map((event: BridgeData) => {
    const {transactionHash, blockNumber, eosAccName: name, amount, logIndex} = event;
    const uniqueName = getUniqueProposalName(`${blockNumber}${BLOCK_TO_NAME_OFFSET}${logIndex}`);
    return {transactionHash, blockNumber, name, amount, uniqueName};
  });

  return await Promise.all(uniqueNamesWithEvents.map(async({transactionHash, name, amount, uniqueName}) => {
    try {
      return await proposeTransfer({proposer, name, amount, transactionHash, self, requested, uniqueName, time})
    } catch(err) { self.logger.info(`${err}`); return `propose: ${err.json ? err.json.error.details[0].message : err}`};   
  }));
}
