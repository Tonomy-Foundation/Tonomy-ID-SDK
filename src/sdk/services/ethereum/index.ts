import { ethers } from 'ethers';
import { getSettings } from '../../util/settings';
import TonomyTokenABI from './abi/TonomyToken.json';
import Debug from 'debug';
import { randomString } from '../../util/crypto';

const debug = Debug('tonomy-sdk:services:ethereum');

/**
 * Creates and returns an ethers.Contract instance for the TonomyToken contract
 * with the provider and signer configured from settings
 *
 * @returns Configured ethers.Contract instance
 */
export function getBaseTokenContract(): ethers.Contract {
    const settings = getSettings();

    const provider = new ethers.JsonRpcProvider(settings.baseRpcUrl, settings.baseNetwork, { staticNetwork: true });
    const signer = getSigner();

    return new ethers.Contract(settings.baseTokenAddress, TonomyTokenABI.abi, signer || provider);
}

function getSigner(): ethers.Signer | undefined {
    const settings = getSettings();

    const provider = new ethers.JsonRpcProvider(settings.baseRpcUrl, settings.baseNetwork, { staticNetwork: true });

    try {
        const privateKey = settings.basePrivateKey;

        if (!privateKey) {
            throw new Error('Private key not found');
        }

        return new ethers.Wallet(privateKey, provider);
    } catch (error) {
        return undefined;
    }
}

const EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Verifies that a signature was created by the expected signer.
 * @param {string} message - The original message that was signed
 * @param {string} signature - The signature to verify (from signer.signMessage)
 * @param {string} expectedSigner - The address that should have signed the message
 * @returns {boolean} boolean indicating if the signature is valid and from the expected signer
 */
export function verifySignature(message: string, signature: string, expectedSigner: string): boolean {
    const { address, network, timestamp } = extractProofMessage(message);

    if (address.toLowerCase() !== expectedSigner.toLowerCase()) {
        debug(`Signature verification failed: Expected ${expectedSigner} but got ${address} from the message`);
        return false;
    }

    if (network.toLowerCase() !== getSettings().baseNetwork.toLowerCase()) {
        debug(
            `Signature verification failed: Expected ${getSettings().baseNetwork} but got ${network} from the message`
        );
        return false;
    }

    const now = new Date();
    const timestampDiff = now.getTime() - new Date(timestamp).getTime();

    if (timestampDiff > EXPIRATION_TIME) {
        debug(`Signature verification failed: Timestamp is too old`);
        return false;
    }

    const recoveredAddress = ethers.verifyMessage(message, signature);
    const isValid = recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();

    if (!isValid) {
        debug(`Signature verification failed: Expected ${expectedSigner} but got ${recoveredAddress}`);
    }

    return isValid;
}

export function createProofMessage(address: string, network: string): string {
    const nonce = randomString(8);
    const now = new Date().toISOString();

    return `I am the owner of this address: ${address} on ${network}\nNonce: ${nonce}\nTimestamp: ${now}`;
}

export function extractProofMessage(message: string): {
    address: string;
    network: string;
    nonce: string;
    timestamp: string;
} {
    const lines = message.split('\n');

    if (lines.length < 3) {
        throw new Error('Invalid proof message format');
    }

    try {
        const addressMatch = lines[0].match(/^I am the owner of this address: (0x[a-fA-F0-9]{40}) on (.+)$/);
        const nonceMatch = lines[1].match(/^Nonce: (.+)$/);
        const timestampMatch = lines[2].match(/^Timestamp: (.+)$/);

        if (!addressMatch || !nonceMatch || !timestampMatch) {
            throw new Error('Invalid proof message format');
        }

        return {
            address: addressMatch[1],
            network: addressMatch[2],
            nonce: nonceMatch[1],
            timestamp: timestampMatch[1],
        };
    } catch (error) {
        throw new Error(`Failed to parse proof message: ${error.message}`);
    }
}

/**
 * Creates a signed proof message
 *
 * @returns {Promise<string>} The signed proof message
 */
export async function createSignedProofMessage(): Promise<string> {
    const signer = getSigner();

    if (!signer) {
        throw new Error('Failed to create signer');
    }

    const message = createProofMessage(getSettings().baseTokenAddress, getSettings().baseNetwork);

    return await signer.signMessage(message);
}
