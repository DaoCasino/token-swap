import {nodeConfig, nodeOptions} from "./types/types";
import {Account} from "./index";
import { Api, JsonRpc, RpcError } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';    
const nodeTextDecoder = require('util').TextDecoder;
const nodeTextEncoder = require('util').TextEncoder;
const edgeTextEncoder = require('text-encoding').TextEncoder;
const edgeTextDecoder = require('text-encoding').TextDecoder; 
const _fetch = require('node-fetch');

//const Sleep = require('sleep');
const Eos = require('eosjs');

const STARTUP_TIMEOUT = 30000;
const STARTUP_REQUESTS_DELAY = 100;
const STARTUP_BLOCK = 6;


function checkTimeout(startTime: Date, timeout: number) {
    let currentTime = new Date();
    let timeoutException = new Error('Timeout exception.');
    if (startTime.getTime() - currentTime.getTime() > timeout) {
        throw timeoutException
    }
}


export class Node {
    private _main_account: Account;
    public verbose: boolean;
    public api: any;
    public rpc: any;
    public rpcError: any;
    public testnet: string;


    constructor({verbose, key_provider, http_endpoint, chain_id, contract, scatter}: nodeOptions) {
        this.testnet = http_endpoint; 
        this._main_account = new Account(contract);
        this.verbose = verbose;
        //@ts-ignore
        this.rpc = new JsonRpc(http_endpoint.fullhost ? http_endpoint.fullhost() : http_endpoint, { fetch: typeof navigator === 'undefined' ? _fetch : fetch  });

        if (!scatter && key_provider) {
            const signatureProvider = new JsSignatureProvider(key_provider);
            this.api = new Api(
            {
                rpc: this.rpc,
                chainId: chain_id,
                signatureProvider,
                textDecoder: (typeof navigator === 'undefined') ? new nodeTextDecoder() :
                navigator.product == 'ReactNative' || /rv:11.0/i.test(navigator.userAgent) || /Edge\/\d./i.test(navigator.userAgent) ? 
                new edgeTextDecoder()  : new TextDecoder(),
                textEncoder: (typeof navigator === 'undefined') ? new nodeTextEncoder :
                navigator.product == 'ReactNative' || /rv:11.0/i.test(navigator.userAgent) || /Edge\/\d./i.test(navigator.userAgent) ?
                new edgeTextEncoder()  : new TextEncoder()
            });
        
            return;
        }
        
    }
    public sleep(miliseconds: number) {
        var currentTime = new Date().getTime();
        while (currentTime + miliseconds >= new Date().getTime()) {
        }
     }

    async _waitNodeStartup(timeout: number) {
        

        let startTime = new Date();
        while (true) {
            try {
                let res = await this.rpc.get_info({});
                
                if (res.head_block_producer) {
                    while (true) {
                        try {
                            let res = await this.rpc.get_block(STARTUP_BLOCK);
                            break;
                        } catch (e) {
                            this.sleep(STARTUP_REQUESTS_DELAY);
                            checkTimeout(startTime, timeout);
                        }
                    }
                    break;
                }
            } catch (e) {
               this.sleep(STARTUP_REQUESTS_DELAY);
                checkTimeout(startTime, timeout);
            }
        }
    }

    async connect() {
        await this._waitNodeStartup(STARTUP_TIMEOUT);
    }

    getMainAccount() {
        return this._main_account;
    }

}