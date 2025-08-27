import { Name } from '@wharfkit/antelope';
import { DIDurl } from './types';
import { ParsedDID, parse } from 'did-resolver';
import { getChainId } from '../../services/blockchain';
import { SdkErrors, throwError } from '../errors';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:util:ssi:did');

export function getAccountNameFromDid(did: DIDurl): Name {
    const parsed = parseAntelopeDid(did);

    return Name.from(parsed.account);
}

export function parseAntelopeDid(did: DIDurl): ParsedDID & {
    chain: string;
    account: string;
} {
    const parsed = parseDid(did);

    if (parsed.method !== 'antelope') {
        throwError(`Invalid DID method: ${parsed.method}`, SdkErrors.InvalidData);
    }

    const idSplit = parsed.id.split(':');
    const chain = idSplit.slice(0, idSplit.length - 1).join(':');
    const account = idSplit[idSplit.length - 1];

    return {
        ...parsed,
        chain,
        account,
    };
}

export function parseDid(did: DIDurl): ParsedDID {
    const parsed = parse(did);

    if (!parsed) throw new Error(`Invalid DID: ${did}`);

    return parsed;
}

/**
 * Checks if a DID is a valid Antelope DID, sent from the correct source account and chain.
 * - DID must use the "antelope" method
 * - DID must be from the ops.tmy account with #active fragment
 * - DID must be from the correct chain
 *
 * @param {string} did - The DID to check
 * @param {object} options
 * @param {boolean} [options.verifyChainId=true] - Whether to verify the chain ID
 * @returns {Promise<void>} - Throws if invalid
 */
export async function verifyOpsTmyDid(
    did: string,
    { verifyChainId = true }: { verifyChainId?: boolean } = {}
): Promise<void> {
    const { account, fragment } = parseAntelopeDid(did);

    if (account !== 'ops.tmy') {
        throwError(`DID must be from ops.tmy account, got: ${account}`, SdkErrors.InvalidData);
    }

    if (fragment !== 'active') {
        throwError(`DID must use #active fragment, got: #${fragment}`, SdkErrors.InvalidData);
    }

    await checkChainId(did, verifyChainId);
}

export async function checkChainId(did: string, verifyChainId: boolean = true): Promise<string | undefined> {
    if (verifyChainId) {
        const chainId = await getChainId();
        const didChainId = parseAntelopeDid(did).chain;

        if (didChainId !== chainId.toString()) {
            throwError(`Invalid chain ID expected ${chainId.toString()} found ${didChainId}`, SdkErrors.InvalidData);
        }

        return didChainId;
    }

    return;
}
