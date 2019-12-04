import {deployerOptions} from "./types/types";
import {Account, Transaction} from "../../common-utils/src/index";
import {Serialize} from "eosjs";


export class Deployer {
    private _api: any;
    private _contract_name: string;
    private _deployer_account?: Account;
    private _wasm: string = '';
    private _abi: string = '';
    private _after_deploy_tr?: Transaction;
    private _before_deploy_tr?: Transaction;

    constructor({api, contract_name}: deployerOptions) {
        this._api = api;
        this._contract_name = contract_name;
    }

    from(account: Account) {
        if (!account.isAccount) {
            throw new Error('Account must be instance of account.js');
        }

        this._deployer_account = account;

        return this;
    }

    abi(abi: string) {
        this._abi = abi;
        return this;
    }

    wasm(wasm: string) {
        this._wasm = wasm;

        return this;
    }

    afterDeploy(transaction: Transaction) {
        if (!transaction.isTransaction) {
            throw new Error('Transaction must be instance of transaction.js');
        }

        this._after_deploy_tr = transaction;

        return this;
    }

    beforeDeploy(transaction: Transaction) {
        if (!transaction.isTransaction) {
            throw new Error('Transaction must be instance of transaction.js');
        }

        this._before_deploy_tr = transaction;

        return this;
    }
    sleep(timeout: number): Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(resolve, timeout);
        })
    }

    async deploy() {
        if (!this._wasm || !this._abi || !this._deployer_account) {
            throw new Error('Deployer not initialized');
        }

        if (this._before_deploy_tr) {
            await this._api.transact(this._before_deploy_tr);
        }
        const buffer = new Serialize.SerialBuffer({
            textEncoder: this._api.textEncoder,
            textDecoder: this._api.textDecoder,
          })
        
          let abi = JSON.parse(this._abi);
          const abiDefinition = this._api.abiTypes.get(`abi_def`)
          abi = abiDefinition.fields.reduce(
            (acc: any, { name: fieldName }: any) =>
              Object.assign(acc, { [fieldName]: acc[fieldName] || [] }),
            abi
          )
          abiDefinition.serialize(buffer, abi)
        
        // Publish contract to the blockchain
        const result = await this._api.transact({
            actions: [{
                account: 'eosio',
                name: 'setcode',
                authorization: [{
                    actor: this._deployer_account.name,
                    permission: 'active',
                }],
                data: {
                    account: this._deployer_account.name,
                    vmtype: 0,
                    vmversion: 0,
                    code: this._wasm
                },
            },
                {
                    account: 'eosio',
                    name: 'setabi',
                    authorization: [{
                        actor: this._deployer_account.name,
                        permission: 'active',
                    }],
                    data: {
                        account: this._deployer_account.name,
                        abi: Buffer.from(buffer.asUint8Array()).toString(`hex`)
                    },
                }

            ]
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        }).catch((err: any) => console.log('erre2', err));

        if (this._after_deploy_tr) {
            await this._after_deploy_tr.execute(this._api);
        }

        return result;
    }
}
