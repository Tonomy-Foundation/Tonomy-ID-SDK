import { ethers } from 'ethers';
import { getSettings, isProduction } from '../../util/settings';
import Debug from 'debug';
import { randomString } from '../../util/crypto';
// eslint-disable-next-line camelcase
import { TonomyToken, TonomyToken__factory } from './typechain'; // adjust path if different

const debug = Debug('tonomy-sdk:services:ethereum');

export function getProvider(): ethers.Provider {
    const settings = getSettings();

    if (isProduction()) return new ethers.JsonRpcProvider(settings.baseRpcUrl, settings.baseNetwork);
    return new ethers.JsonRpcProvider(settings.baseRpcUrl, undefined, { staticNetwork: true });
}

export async function ensureBaseTokenDeployed(): Promise<void> {
    const { baseTokenAddress } = getSettings();
    const provider = getProvider();
    const code = await provider.getCode(baseTokenAddress);

    if (code === '0x') {
        throw new Error(`No contract code at baseTokenAddress ${baseTokenAddress}. Did you run deployment?`);
    }
}

/**
 * Creates and returns a TonomyToken contract instance with the provider and signer configured from settings
 *
 * @returns {TonomyToken} Configured contract instance
 */
export function getBaseTokenContract(signer?: ethers.Signer): TonomyToken {
    const { baseTokenAddress } = getSettings();

    signer = signer ?? getSigner();
    const provider = getProvider();

    // eslint-disable-next-line camelcase
    return TonomyToken__factory.connect(baseTokenAddress, signer || provider);
}

let browserInjectedSigner: ethers.Signer | undefined;

export async function getBrowserSigner(): Promise<ethers.Signer | undefined> {
    if (browserInjectedSigner) return browserInjectedSigner;
    if (typeof window === 'undefined') return;
    const anyWindow = window as any;
    const injected = anyWindow.ethereum;

    if (!injected) {
        debug('No injected EVM provider (window.ethereum) found');
        return;
    }

    try {
        const browserProvider = new ethers.BrowserProvider(injected);

        // Request accounts (prompts user)
        await browserProvider.send('eth_requestAccounts', []);
        const signer = await browserProvider.getSigner();

        // (Optional) network check
        try {
            const net = await browserProvider.getNetwork();

            debug(`Injected provider chainId: ${net.chainId.toString()}`);
        } catch (e) {
            debug('Failed to read injected network:', e);
        }

        browserInjectedSigner = signer;
        debug(`Using injected browser signer: ${await signer.getAddress()}`);
        return browserInjectedSigner;
    } catch (err) {
        console.error('Failed to initialize browser signer:', err);
        return;
    }
}

export function getSigner(): ethers.Signer | undefined {
    const settings = getSettings();
    const provider = getProvider();

    try {
        const privateKey = settings.basePrivateKey;

        if (!privateKey) {
            debug('No private key configured and no injected signer available');
            return undefined;
        }

        return new ethers.Wallet(privateKey, provider);
    } catch (error) {
        console.error('Failed to create signer:', error);
        return undefined;
    }
}

const EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes
const seenNonces: Map<string, Date> = new Map(); // Map<nonce, Date>

/**
 * Checks if a nonce has been seen before
 *
 * @param {string} nonce - the nonce to check
 * @returns {boolean} true if the nonce has been seen before
 */
function checkSeenNonce(nonce: string): boolean {
    const res = seenNonces.has(nonce);

    addSeenNonce(nonce);
    trimSeenNonces();
    return res;
}

function trimSeenNonces(): void {
    seenNonces.forEach((date, nonce) => {
        if (date.getTime() + EXPIRATION_TIME < Date.now()) {
            seenNonces.delete(nonce);
        }
    });
}

function addSeenNonce(nonce: string): void {
    seenNonces.set(nonce, new Date());
}

/**
 * Verifies that a signature was created by the expected signer.
 * @param {string} message - The original message that was signed
 * @param {string} signature - The signature to verify (from signer.signMessage)
 * @param {string} expectedSigner - The address that should have signed the message
 * @returns {boolean} boolean indicating if the signature is valid and from the expected signer
 */
export function verifySignature(
    message: string,
    signature: string,
    expectedSigner: string
): { result: boolean; reason?: string } {
    const { address, network, timestamp, nonce } = extractProofMessage(message);

    if (checkSeenNonce(nonce)) {
        return { result: false, reason: `Nonce ${nonce} has been seen before` };
    }

    if (address.toLowerCase() !== expectedSigner.toLowerCase()) {
        return { result: false, reason: `Expected address ${expectedSigner} but got ${address} from the message` };
    }

    if (network.toLowerCase() !== getSettings().baseNetwork.toLowerCase()) {
        return {
            result: false,
            reason: `Expected network ${getSettings().baseNetwork} but got ${network} from the message`,
        };
    }

    const now = new Date();
    const timestampDiff = now.getTime() - new Date(timestamp).getTime();

    if (timestampDiff > EXPIRATION_TIME) {
        return { result: false, reason: `Timestamp ${timestamp} is too old` };
    }

    const recoveredAddress = ethers.verifyMessage(message, signature);
    const isValid = recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();

    if (!isValid) {
        return { result: false, reason: `Expected ${expectedSigner} but got ${recoveredAddress}` };
    }

    return { result: true };
}

export function createProofMessage(address: string, network: string): string {
    const nonce = randomString(8);
    const now = new Date().toISOString();

    //set base address and network
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
 * @returns {Promise<{ message: string; signature: string }>} The message and signature
 */
export async function createSignedProofMessage(
    signer?: ethers.Signer
): Promise<{ message: string; signature: string }> {
    signer = signer ?? (await getBrowserSigner());
    if (!signer) throw new Error('No signer available to sign proof message');

    const address = await signer.getAddress();
    const message = createProofMessage(address, getSettings().baseNetwork);
    const signature = await signer.signMessage(message);

    return { message, signature };
}
