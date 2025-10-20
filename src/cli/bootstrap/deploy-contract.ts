// https://medium.com/coinmonks/setcode-and-setabi-with-eos-js-dd83480ba234

import fs from 'fs';
import { Name, NameType } from '@wharfkit/antelope';
import { Signer } from '../../sdk/services/blockchain/eosio/transaction';
import { getEosioContract, getTonomyEosioProxyContract } from '../../sdk';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const thisFileDirectory = __dirname;
const defaultContractDirectory = path.join(thisFileDirectory, '..', '..', 'Tonomy-Contracts', 'contracts');

export function getDeployableFiles(contract: string, directory?: string): { wasmFile: Buffer; abiFile: string } {
    const contractDir = directory ?? `${defaultContractDirectory}/${contract.toString()}`;

    const { wasmPath, abiPath } = getDeployableFilePathsFromDir(contractDir);

    const wasmFile = fs.readFileSync(wasmPath);
    const abiFile = fs.readFileSync(abiPath, 'utf8');

    return { wasmFile, abiFile };
}

function getDeployableFilePathsFromDir(dir: string): { wasmPath: string; abiPath: string } {
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
    { account, contractDir }: { account: NameType; contractDir?: string },
    signer: Signer | Signer[],
    options?: {
        throughTonomyProxy?: boolean;
    }
) {
    const { wasmFile, abiFile } = getDeployableFiles(account.toString(), contractDir);

    const contract = options?.throughTonomyProxy ? getTonomyEosioProxyContract() : getEosioContract();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await contract.deployContract(Name.from(account) as any, wasmFile, abiFile, signer);
}
