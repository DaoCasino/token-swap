const Web3 = require('web3');
const HDWalletProvider = require("@truffle/hdwallet-provider");
import token from './contracts/eth/DaoToken.json';
import bridge from '../artifacts/Converter.json'
import claimConvert from './contracts/eth/ClaimConvertStrategy.json';

let provider = new HDWalletProvider('grass female find slogan motion old merry reject flame direct cycle stomach', "http://127.0.0.1:7545");
const web3 = new Web3(provider);

const bridgeContract = new web3.eth.Contract(bridge.abi, '0x72Cd6A9B1f481abf88cc47acA86CF7423CaA8457');
const claimContract = new web3.eth.Contract(bridge.abi, '0x0E50336237698Ac399C6Fad7Def8932d28AcEeb6');
//approve(tokenContract).then(res => console.log(JSON.stringify(res)))

web3.eth.getAccounts().then(console.log)
bridgeContract.methods.nextStage()
.send(
    {
        from: '0x6397c23f4e8914197699ba54Fc01333053C967cE',
        gas: 4612388,
        gasPrice: 15000000000
    }).then(console.log).catch(console.log);/*.then(() => {
        bridgeContract.methods.setConvertStrategy('0x0E50336237698Ac399C6Fad7Def8932d28AcEeb6').send(
            {
                from: '0x6397c23f4e8914197699ba54Fc01333053C967cE',
                gas: 4612388,
                gasPrice: 15000000000
            }).then(() => {
                claimContract.methods.transferOwnership('0x779CC95637A198e17873b96Cef0713AEddc319c3').send(
                    {
                        from: '0x6397c23f4e8914197699ba54Fc01333053C967cE',
                        gas: 4612388,
                        gasPrice: 15000000000
                    })
            }).then(console.log).catch(console.log)
        
    })*/

