const fs = require('fs');
const path = require('path');

export class Binaries {
    static tokenAbi = fs.readFileSync(path.resolve(__dirname, '..', 'bin', 'eosio.token.abi'));
    static tokenWasm = fs.readFileSync(path.resolve(__dirname, '..', 'bin', 'eosio.token.wasm'));
    static mainAbi = fs.readFileSync(path.resolve(__dirname, '..', 'bin', 'main.abi'));
    static mainWasm = fs.readFileSync(path.resolve(__dirname, '..', 'bin', 'main.wasm'));
    static msigAbi = fs.readFileSync(path.resolve(__dirname, '..', 'bin', 'eosio.msig.abi'));
    static msigWasm = fs.readFileSync(path.resolve(__dirname, '..', 'bin', 'eosio.msig.wasm'));
    static biosAbi = fs.readFileSync(path.resolve(__dirname, '..', 'bin', 'eosio.bios.abi'));
    static biosWasm = fs.readFileSync(path.resolve(__dirname, '..', 'bin', 'eosio.bios.wasm'));
}
