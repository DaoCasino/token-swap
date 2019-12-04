import { Oracle } from './oracle';
import fs from 'fs';
const conf = fs.readFileSync('./conf.json', 'utf-8');
const config = JSON.parse(conf);
const { multiSig, permission, accountName, KeyProvider, Net, ChainId, ethNet, ethContractAddress, Contract, clockApi, blocksBehind } = config;
new Oracle(multiSig, permission, accountName, KeyProvider, Net, ChainId, ethNet, ethContractAddress, Contract, clockApi, blocksBehind).start(Date.now());