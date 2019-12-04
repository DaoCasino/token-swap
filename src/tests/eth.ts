import Web3 from 'web3';
const HDWalletProvider = require("@truffle/hdwallet-provider");
import token from '../artifacts/DaoToken.json';
import bridge from '../artifacts/Bridge.json'
import {sleep} from '../shared/utils';

async function approve(tokenContract: any) {
    return await tokenContract.methods.approve('0x72Cd6A9B1f481abf88cc47acA86CF7423CaA8457', '999000000000000000000').send(
        {
            from: '0x6397c23f4e8914197699ba54Fc01333053C967cE',
            gas: 4612388,
            gasPrice: 15000000000
        });
}
let provider = new HDWalletProvider('grass female find slogan motion old merry reject flame direct cycle stomach', "http://127.0.0.1:7545");
const web3 = new Web3(provider);
const tokenContract = new web3.eth.Contract(token.abi, '0x779CC95637A198e17873b96Cef0713AEddc319c3');

const bridgeContract = new web3.eth.Contract(bridge.abi, '0x72Cd6A9B1f481abf88cc47acA86CF7423CaA8457');
approve(tokenContract).then(res => console.log(JSON.stringify(res)))

async function dfo() {
    let x = 0;
    while(x < 4500) {
        x++;
        console.log(x);
        await bridgeContract.methods.convert( "testsjiyqryl", 'EOS8EyRbdEgoEV4XGVLLjZjBeSfg2CzykBGPrJWY7uAFA8avoX5wr', '100000000000000000').send(
            {
                from: '0x6397c23f4e8914197699ba54Fc01333053C967cE',
                gas: 4612388,
                gasPrice: 15000000000
            })
        await bridgeContract.methods.convert("katezqa12345", 'EOS8f16NRLEdocugMrpp2UTBMYQRsceCQAK7ubrzASTPYHbpbqzLM', '100100000000000000').send(
            {
                from: '0x6397c23f4e8914197699ba54Fc01333053C967cE',
                gas: 4612388,
                gasPrice: 15000000000
            })
        //await sleep(100);
    }
}

dfo();
