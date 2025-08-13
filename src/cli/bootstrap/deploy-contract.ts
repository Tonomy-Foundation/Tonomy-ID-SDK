// https://medium.com/coinmonks/setcode-and-setabi-with-eos-js-dd83480ba234

import fs from 'fs';
import path from 'path';
import { Name, NameType, PermissionLevelType } from '@wharfkit/antelope';
import { Signer } from '../../sdk/services/blockchain/eosio/transaction';
import { eosioContract, tonomyEosioProxyContract } from '../../sdk';

export function getDeployableFilesFromDir(dir: string) {
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

export default async function deployContract(
    { account, contractDir }: { account: NameType; contractDir: string },
    signer: Signer | Signer[],
    options?: {
        extraAuthorization?: PermissionLevelType;
        throughTonomyProxy?: boolean;
    }
) {
    const { wasmPath, abiPath } = getDeployableFilesFromDir(contractDir);

    const wasmFile = fs.readFileSync(wasmPath);
    const abiFile = fs.readFileSync(abiPath, 'utf8');

    const contract = options?.throughTonomyProxy ? tonomyEosioProxyContract : eosioContract;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await contract.deployContract(Name.from(account) as any, wasmFile, abiFile, signer, options?.extraAuthorization);
}
