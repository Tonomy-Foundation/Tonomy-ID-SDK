import { Name } from '@wharfkit/antelope';
import { DIDurl } from './types';
import { ParsedDID, parse } from 'did-resolver';
import { getChainId } from '../../services/blockchain';
import { SdkErrors, throwError } from '../errors';

export function getAccountNameFromDid(did: DIDurl): Name {
    const parsed = parseDid(did);

    const id = parsed.id.split(':');
    const accountName = id[id.length - 1];

    return Name.from(accountName);
}

export function parseDid(did: DIDurl): ParsedDID {
    const parsed = parse(did);

    if (!parsed) throw new Error('Invalid DID');

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
    const { method, id, fragment } = parseDid(did);

    if (method !== 'antelope') {
        throwError(`Invalid DID method: ${method}`, SdkErrors.InvalidData);
    }

    if (id !== 'ops.tmy') {
        throwError(`DID must be from ops.tmy account, got: ${id}`, SdkErrors.InvalidData);
    }

    if (fragment !== 'active') {
        throwError(`DID must use #active fragment, got: #${fragment}`, SdkErrors.InvalidData);
    }

    if (verifyChainId) {
        const chainId = await getChainId();
        const didChainId = did.split(':')[2];

        if (didChainId !== chainId.toString()) {
            throwError(`Invalid chain ID: expected ${chainId.toString()}, got ${didChainId}`, SdkErrors.InvalidData);
        }
    }
}
