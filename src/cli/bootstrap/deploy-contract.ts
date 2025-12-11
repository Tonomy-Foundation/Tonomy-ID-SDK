// https://medium.com/coinmonks/setcode-and-setabi-with-eos-js-dd83480ba234

import fs from 'fs';
import { Name, NameType } from '@wharfkit/antelope';
import { Signer } from '../../sdk/services/blockchain/eosio/transaction';
import { getEosioContract, getTonomyEosioProxyContract } from '../../sdk';
import path from 'path';
import { fileURLToPath } from 'url';

// Find package root by looking for package.json (works from both src/ and bundled build/)
function findPackageRoot(startPath: string): string {
    let dir = startPath;

    while (dir !== path.parse(dir).root) {
        if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
        dir = path.dirname(dir);
    }

    throw new Error('Could not find package root');
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = findPackageRoot(currentDir);
const defaultContractDirectory = path.join(packageRoot, 'Tonomy-Contracts', 'contracts');

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
