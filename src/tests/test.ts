const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber'))
    .expect;
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
import {TestNode as Node} from './env';
import * as Utils from "./utils/common-utils/src";
import { assert } from "chai";
import {Oracle} from '../oracle'
import {doProposals} from '../procedures/propose';
import {doApproves, addApprovalToCustomProposal} from '../procedures/approve';
import {doCancels} from '../procedures/cancel';
import {doExecs} from '../procedures/exec';
import {getTransactions, getAllCustomProposals, getAllMsigProposals} from '../shared/eosTablesQuery';
import {events as mockEvents} from './mock';
import { CustomProposals, ApprovalWithCustomProposalInfo } from '../types';


async function issueTokens(node: Node, receivers: Array<{ id: string, quantity: string }>, memo: string) {
    const transactions = receivers.map(account =>
        new Utils.Transaction()
            .sender(node.token)
            .receiver(node.token)
            .action('issue')
            .data({to: account.id, quantity: account.quantity, memo})
            .execute(node.api)
    );
    return Promise.all(transactions);
}
describe('Test', async () => {
    const url = 'http://127.0.0.1:8888';
    let node: any;
    let oracle1: Oracle;
    let oracle2: Oracle;
    let oracle3: Oracle;
    let oracle4: Oracle;
    let eventsNumber: number;
    let customProposalsNumber: number;
    let alreadyProposed: any;
    let custProp: CustomProposals[];
   
    before(async function() {
        this.timeout(30000);
        node = new Node(true, false, url, '');
        await node.restart();
        await node.connect();
        await node.init();
        const multiSig = 'testiacdoxbz';
        const permission =  'active';
        const threshold = 3;
        const ethContractAddress = '0x72Cd6A9B1f481abf88cc47acA86CF7423CaA8457';
        const eosContract = 'testy3swqaey';
        const ethNet = 'http://127.0.0.1:7545';
        const clockApi = '';
        

        oracle1 = new Oracle(multiSig, permission, node.first.name, ['5K5MuNu3BBYg4j7LbvXiLKccq4m6VGZzBDYJQ5R2fD9ohx81JUy'], url, '', ethNet, ethContractAddress, eosContract, clockApi, 0);
        oracle2 = new Oracle(multiSig, permission, node.second.name, ['5JCusz54H55TtwocBxNo5CS7vWCc3FjT9GqGWwyVikg3iQYei7T'], url, '', ethNet, ethContractAddress, eosContract, clockApi, 0);
        oracle3 = new Oracle(multiSig, permission, node.third.name, ['5J3qJnGT6vqHsRBeYwVrKz5cvY8KKKY4MFKsxC1s3TFnBu4c6f3'], url, '', ethNet, ethContractAddress, eosContract, clockApi, 0);
        oracle4 = new Oracle(multiSig, permission, node.main.name, ['5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'], url, '', ethNet, ethContractAddress, eosContract, clockApi, 0);
    });

   it('#initiate()', async () => {
        
    });
   it('#makeProposals - custom proposals quantity must be the same like events quantity + 2', async () => {
        const requested = [{
            "actor": "first12345ab",
            "permission": "active"
        },
        {
            "actor": "second12345a",
            "permission": "active"
        },
        {
            "actor": "third12345ab",
            "permission": "active"
        }];

        function propose(item: Oracle): Function {
            return () => {
                return getTransactions(item)
                .then((trx: any) => {
                    return Promise.all([
                    oracle1.contract.getPastEvents('Swap', {fromBlock: 0})
                    .then((events: any) => events.concat(mockEvents))
                    .catch((err: any) => console.log(JSON.stringify(err))),
                    getAllCustomProposals(item)])
                    .then((res: any) => {
                        item.ethEvents = res[0];
                        const {eventsToPropose} = item.getTwoTypesofProposals(res[1].rows, Date.now());
                        return doProposals(item, eventsToPropose, item.accountName, requested, Date.now())
                        .catch((err: any) => process.stdout.write(`${err}`));
                    });
                });
            }
        }
        const res = await Promise.all([
            propose(oracle1)().then((res: any) => ({res, filtered: res.filter((x: any) => typeof x !== 'string')})),
            propose(oracle2)().then((res: any) => ({res, filtered: res.filter((x: any) => typeof x !== 'string')})),
            propose(oracle3)().then((res: any) => ({res, filtered: res.filter((x: any) => typeof x !== 'string')}))
        ]);
        customProposalsNumber = res[0].filtered.length + res[1].filtered.length + res[2].filtered.length;
        assert.equal(oracle1.ethEvents.length, customProposalsNumber + 2);
    });
    it('#makeApprovals- approve only valid', async () => {
        function approve(item: Oracle): Function {
            return () => {
                return Promise.all([
                    getAllCustomProposals(item)
                    .then((prop: any) => {
                        custProp = prop.rows; 
                        return addApprovalToCustomProposal(custProp, item);
                    })
                    .then((res: any) => {
                        return doApproves(item, custProp, res)
                    })
                ]);
            }
        }
        const res = await Promise.all([
            approve(oracle1)(),
            approve(oracle2)(),
            approve(oracle3)()
        ]);

        assert.equal(res[0][0].length, oracle1.ethEvents.length - 2);
        assert.equal(res[1][0].length, oracle2.ethEvents.length - 2);
        assert.equal(res[2][0].length, oracle3.ethEvents.length - 2);
    });
    it('#makeCancels - delete odd proposals from eosio.msig', async () => {
        const date = new Date();
        oracle1.timeOffset = date.getTimezoneOffset() * 60000;
        await Promise.all([
            doCancels(oracle1, custProp, 'first12345ab', [], Date.now()),
            doCancels(oracle2, custProp, 'second12345a', [], Date.now()),
            doCancels(oracle3, custProp, 'third12345ab', [], Date.now())
        ]).then(console.log)
        const res = await Promise.all([
            getAllMsigProposals(oracle1, 'first12345ab'),
            getAllMsigProposals(oracle2, 'second12345a'),
            getAllMsigProposals(oracle3, 'third12345ab')
        ]);
        assert.equal(res[0].rows.length + res[1].rows.length + res[2].rows.length, customProposalsNumber);
    });
    it('#makeExecs - exec all approved events', async () => {
        const res = await Promise.all([
            addApprovalToCustomProposal(custProp, oracle1)
            .then((res: any) => doExecs(oracle1, res))
           
        ]);
        assert.equal(res[0].length, oracle1.ethEvents.length - 2);
    });

    after(function () {
       // node.kill();
    });
})