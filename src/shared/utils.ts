import { Serialize, Numeric } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { Api, JsonRpc } from 'eosjs'; 
import {ProposedTransaction} from '../types'
import winston from 'winston';
const nodeTextDecoder = require('util').TextDecoder;
const nodeTextEncoder = require('util').TextEncoder;
const fetch = require('node-fetch').default;
const BigNumber = require('big-number');
const textDecoder = require('util').TextDecoder;
const textEncoder = require('util').TextEncoder;

export function getEncodedName(name: string) {
  const buffer: Serialize.SerialBuffer = new Serialize.SerialBuffer({textEncoder, textDecoder});
  buffer.pushName(name);
  return new BigNumber(Numeric.binaryToDecimal(buffer.getUint8Array(8)));
}


export async function getUnpackedTransaction(packed_transaction: string, api: Api): Promise<ProposedTransaction> {
  return await api.deserializeTransactionWithActions(packed_transaction);
}

export function sleep (time: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time));
}

/**
 * 
 * @param eosKeyProvider - приватный ключ
 * @param eosNet - сеть eth
 * @param eosChainId
 */
export function getApi(eosKeyProvider: string[], eosNet: string, eosChainId: string): {eosApi: Api, eosRpc: JsonRpc} {
  const signatureProvider = new JsSignatureProvider(eosKeyProvider);
    const eosRpc = new JsonRpc(eosNet, {fetch});
    const eosApi = new Api({
      rpc: eosRpc,
      chainId: eosChainId,
      signatureProvider,
      textDecoder: new nodeTextDecoder(),
      textEncoder: new nodeTextEncoder()
    });
  return {eosApi, eosRpc}
}
export function incrementHash(hash: string) {
  return hash;
}

/**
 * 
 * @param blockData - данные из эвента для создания уникального имени для propose
 * создает имя заменяя цифру на букву
 */
export function getUniqueProposalName(blockData: string): string {

  const tpm = blockData.split('');
  const replaces = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  return tpm.map((name: string) => replaces[parseInt(name)]).join('');
}

export function getLogger(): winston.Logger {
  const logger =  winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
      new winston.transports.File({ filename: 'info.log', level: 'info' }),
    ]
  });
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.simple()
    }));
  }
  return logger;
}

export function formatString(str: string) {
  return str.toLowerCase().trim();
}

export function formatHashToEos(str: string) {
  return str.toLowerCase().trim().replace(/^0x/, '');
}