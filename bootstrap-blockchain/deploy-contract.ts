// https://medium.com/coinmonks/setcode-and-setabi-with-eos-js-dd83480ba234

import fs from 'fs';
import path from 'path';
import { Name } from '@greymass/eosio';
import { EosioContract } from '../src/index';

const eosioContract: EosioContract = EosioContract.Instance;

function getDeployableFilesFromDir(dir: string) {
    const dirCont = fs.readdirSync(dir);

    const wasmFileName = dirCont.find((filePath) => filePath.match(/.*\.(wasm)$/gi));
    const abiFileName = dirCont.find((filePath) => filePath.match(/.*\.(abi)$/gi));
    if (!wasmFileName) throw new Error(`Cannot find a ".wasm file" in ${dir}`);
    if (!abiFileName) throw new Error(`Cannot find an ".abi file" in ${dir}`);

    return {
        wasmPath: path.join(dir, wasmFileName),
        abiPath: path.join(dir, abiFileName),
    };
}

async function deployContract({ account, contractDir }, signer) {
    const { wasmPath, abiPath } = getDeployableFilesFromDir(contractDir);

    const wasmFile = fs.readFileSync(wasmPath);
    const abiFile = fs.readFileSync(abiPath, 'utf8');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await eosioContract.deployContract(Name.from(account) as any, wasmFile, abiFile, signer);
}

export default deployContract;
