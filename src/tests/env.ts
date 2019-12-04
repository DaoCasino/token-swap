const path = require('path');
const fs = require('fs');
import { Account, Node, Transaction} from './utils/common-utils/src';
import {Deployer} from './utils/node-utils/src';
import { spawn, execSync } from 'child_process';
const PROJECT_PATH = path.join(__dirname + '/..');
import * as stream from "stream";
import { Binaries } from "./contracts/src";


//TODO: receive dynamically
const NODEOS_PATH = '/usr/local/bin/nodeos';


const ACC_TEST0_PRIV_KEY = '5Jga878DkRU1NRB7tfAYoS5gxu6isxHq7UUe2e1eCdscTtyeNQM';
const ACC_TEST1_PRIV_KEY = '5K5MuNu3BBYg4j7LbvXiLKccq4m6VGZzBDYJQ5R2fD9ohx81JUy';
const ACC_TEST2_PRIV_KEY = '5JCusz54H55TtwocBxNo5CS7vWCc3FjT9GqGWwyVikg3iQYei7T';
const ACC_TEST3_PRIV_KEY = '5J3qJnGT6vqHsRBeYwVrKz5cvY8KKKY4MFKsxC1s3TFnBu4c6f3';
const ACC_OWNER_PRIV_KEY = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3';
const ACC_MSIG_PRIV_KEY = '5JdqFYGec1bAcv25MuJWCkaPw2YzNXynPQoxqMB5qHgHYAMLY9F';



function waitEvent(event: stream.Readable, type: string) {
    return new Promise(function(resolve, reject) {
        function listener(data: any) {
            event.removeListener(type, listener);
            resolve(data);
        }

        event.on(type, listener);
    });
}

export class TestNode extends Node {
    private recompile: boolean;
    private running: boolean;
    public multisig: Account;
    private main: Account;
    private msig: Account;
    public token: Account;
    private nodeos_path: string;
    private instance: any;
    public first: Account;
    public second: Account;
    public third: Account;
    

    constructor(verbose: boolean, recompile: boolean, endpoint: string, chain_id: any) {
        super({verbose, key_provider: [
            "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3",
            '5Jga878DkRU1NRB7tfAYoS5gxu6isxHq7UUe2e1eCdscTtyeNQM',
            '5K5MuNu3BBYg4j7LbvXiLKccq4m6VGZzBDYJQ5R2fD9ohx81JUy',
            '5JCusz54H55TtwocBxNo5CS7vWCc3FjT9GqGWwyVikg3iQYei7T',
            '5J3qJnGT6vqHsRBeYwVrKz5cvY8KKKY4MFKsxC1s3TFnBu4c6f3',
            '5JdqFYGec1bAcv25MuJWCkaPw2YzNXynPQoxqMB5qHgHYAMLY9F'
        ], http_endpoint: endpoint, chain_id, contract: "testy3swqaey"});
        this.recompile = recompile;
        this.running = false;
        this.instance = null;
        this.nodeos_path = NODEOS_PATH;
        this.multisig = new Account('testiacdoxbz');
        this.multisig.usePrivateKey(ACC_TEST0_PRIV_KEY);
        this.first = new Account('first12345ab');
        this.first.usePrivateKey(ACC_TEST1_PRIV_KEY);
        this.second = new Account('second12345a');
        this.second.usePrivateKey(ACC_TEST2_PRIV_KEY);
        this.third = new Account('third12345ab');
        this.third.usePrivateKey(ACC_TEST3_PRIV_KEY);
        this.token = new Account('eosio.token');
        this.token.usePrivateKey(ACC_OWNER_PRIV_KEY);
        this.msig = new Account('eosio.msig');
        this.msig.usePrivateKey(ACC_MSIG_PRIV_KEY);
        this.main = this.getMainAccount();
        this.main.usePrivateKey(ACC_OWNER_PRIV_KEY);
    }
    async run() {
        if (this.instance) {
            throw new Error('Test EOS node is already running.');
        }
        // use spawn function because nodeos has infinity output
        this.instance = spawn('nodeos', ['-e -p eosio', '--delete-all-blocks', '--plugin eosio::producer_plugin', '--plugin eosio::history_plugin', '--plugin eosio::chain_api_plugin', '--plugin eosio::history_api_plugin', '--plugin eosio::http_plugin', '--contracts-console'], {shell: true});
        // wait until node is running

        while (this.running === false) {
            await waitEvent(this.instance.stderr, 'data');
                if (this.running === false) {
                    this.running = true;
                }
        }

    }

    kill() {
        if (this.instance) {
            this.instance.kill();
            //process.kill(-this.instance.pid, "SIGTERM");
            //process.kill(-this.instance.pid, "SIGINT");
                this.instance = null;
                this.running = false;
        }
    }

     async restart() {
        this.kill();
        await this.run();
        if (!this.running) {
            throw new Error('Eos node must running receiver setup initial state.');
        }
    }

    async init() {
        await this.registerAccounts(this.api);
        await this.createMultisig();
        await this.deploy(this.api);
        await this.handlePermission(this.main);

    }

    async registerAccounts(api: any) {
        const results = [];
        results.push(await this.first.register(api));
        results.push(await this.second.register(api));
        results.push(await this.third.register(api));
        results.push(await this.main.register(api));
        results.push(await this.token.register(api));
        results.push(await this.multisig.register(api));
        results.push(await this.msig.register(api));
        return results;
    }

    async createMultisig() {
       const multisigList = ['first12345ab', 'second12345a', 'third12345ab']
       .map(item => ({
            "permission": {
                "actor": item,
                "permission": "active"
            },
            "weight": 1
        }));

        const data = {
			'account': 'testiacdoxbz',
			'permission': 'active',
			'parent': 'owner',
			"auth": {
				"threshold": 3,
				"keys": [],
				"accounts": multisigList,
                "waits":[]
            }
        }
        
        return await new Transaction()
            .sender(this.multisig, 'owner')
            .receiver(new Account('eosio'))
            .action('updateauth')
            .data(data)
            .execute(this.api);
    }

    async deploy(api: any) {
        const results: any = [];
        const deployer = new Deployer({api, contract_name: 'testy3swqaey'});
        deployer.from(this.main);
        deployer.abi(Binaries.mainAbi);
        deployer.wasm(Binaries.mainWasm);
        results.push(await deployer.deploy());
        const deployer2 = new Deployer({api, contract_name: 'eosio.msig'});
        deployer2.from(this.msig);
        deployer2.abi(Binaries.msigAbi);
        deployer2.wasm(Binaries.msigWasm);
        results.push(await deployer2.deploy());
        let createTokenTransaction = new Transaction()
            .sender(this.token)
            .receiver(this.token)
            .action('create')
            .data({issuer: this.token.name, maximum_supply: '1000000000 TST'});

        results.push(
            await new Deployer({api, contract_name: 'eosio.token'})
                .from(this.token)
                .abi(Binaries.tokenAbi)
                .wasm(Binaries.tokenWasm)
                .afterDeploy(createTokenTransaction)
                .deploy()
        );
        return results;
    }

    async handlePermission(acc: Account) {
        const account = await this.rpc.get_account(acc.name);
        const { accounts, keys, waits }  = JSON.parse(JSON.stringify(account.permissions)).filter((x: any) => x.perm_name === 'active')[0].required_auth; 

        
        const newPermission = [{
            "permission": {
                "actor": 'testy3swqaey',
                "permission": "eosio.code"
            },
            "weight": acc.name === 'testiacdoxbz' ? 3 : 1
        }];

        const key = await this.api.signatureProvider.getAvailableKeys();
        const newKeys = keys.length ? keys : [
            {
                "key": key[0],
				"weight": acc.name === 'testiacdoxbz' ? 3 : 1
            }
        ];


        const data = {
			'account': acc.name,
			'permission': 'active',
			'parent': 'owner',
			"auth": {
				"threshold": 1,
				"keys": newKeys,
				"accounts": newPermission.concat(accounts),
                "waits": waits
            }
        }
        
        return await new Transaction()
            .sender(acc, 'owner')
            .receiver(new Account('eosio'))
            .action('updateauth')
            .data(data)
            .execute(this.api).catch((err: any) => console.log(err))
    }

}
