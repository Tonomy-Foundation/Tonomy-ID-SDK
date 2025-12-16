import { ethers, formatUnits, parseUnits } from 'ethers';
import { getSettings, isProduction } from '../../util/settings';
import Debug from 'debug';
import { randomString } from '../../util/crypto';
// eslint-disable-next-line camelcase
import { TonomyToken, TonomyToken__factory } from './typechain'; // adjust path if different
import Decimal from 'decimal.js';
import { createSafeClient, SafeClientResult } from '@safe-global/sdk-starter-kit';

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

export async function tonomyToBaseTransfer(
    to: ethers.AddressLike,
    quantity: Decimal,
    memo: string,
    signer: ethers.Signer
): Promise<ethers.TransactionResponse> {
    const { baseTokenAddress } = getSettings();

    const token = getBaseTokenContract();
    const weiAmount = parseUnits(quantity.toString(), 18);

    // Check balance first
    const signerAddress = await signer.getAddress();

    debug(
        `signer: ${signer}, Address: ${to}, signerAddress, ${signerAddress}, baseTokenAddress: ${baseTokenAddress} token: ${token} `
    );
    const balance = await token.balanceOf(signerAddress);

    debug(`Available: ${formatUnits(balance, 18)},`);

    const transferData = getBaseTokenContract(signer).interface.encodeFunctionData('transfer', [to, weiAmount]);
    const memoHex = ethers.hexlify(ethers.toUtf8Bytes(memo)).substring(2);

    const tx = {
        from: signerAddress,
        to: baseTokenAddress,
        data: transferData + memoHex,
    };

    debug(`Sending transaction`, JSON.stringify(tx, null, 2));

    return await signer.sendTransaction(tx);
}

export async function decodeTransferTransaction(txHash: string): Promise<{
    from: string;
    to: string;
    amount: Decimal;
    memo: string;
}> {
    const provider = getProvider();

    const tx = await provider.getTransaction(txHash);

    if (!tx) throw new Error('Transaction not found');
    const token = getBaseTokenContract();
    // ABI-decode the transfer function call
    // transfer(address to, uint256 amount)
    const decoded = token.interface.decodeFunctionData('transfer', tx.data);
    const transferTo = decoded[0] as string;
    const rawAmount = decoded[1] as bigint;
    const amount = new Decimal(formatUnits(rawAmount, 18));
    // Extract memo from leftover bytes
    // transfer data ends exactly where ABI says it should.
    const transferDataHex = token.interface.encodeFunctionData('transfer', [transferTo, rawAmount]);

    const memoHex = tx.data.substring(transferDataHex.length);
    const memoBytes = memoHex ? ethers.getBytes('0x' + memoHex) : new Uint8Array();
    const memo = memoBytes.length ? ethers.toUtf8String(memoBytes) : '';

    return {
        from: tx.from!,
        to: transferTo,
        amount,
        memo,
    };
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
export async function createSignedProofMessage(signer: ethers.Signer): Promise<{ message: string; signature: string }> {
    if (!signer) throw new Error('No signer available to sign proof message');

    const address = await signer.getAddress();
    const message = createProofMessage(address, getSettings().baseNetwork);
    const signature = await signer.signMessage(message);

    return { message, signature };
}

export async function waitForEvmTrxFinalization(
    txHash: string,
    confirmations?: number,
    timeout: number = 100000
): Promise<ethers.TransactionReceipt> {
    const provider = getProvider();

    // Recommended 3 blocks for Base mainnet, 1 block for testnets and local
    if (!confirmations) confirmations = isProduction() ? 3 : 1;

    debug(`Waiting for ${confirmations} confirmations for transaction ${txHash}`);

    // Wait for the transaction with specified confirmations
    const receipt = await provider.waitForTransaction(txHash, confirmations, timeout);

    if (!receipt) {
        throw new Error(`Transaction ${txHash} was not confirmed within ${timeout} ms`);
    }

    if (receipt.status !== 1) {
        throw new Error(`Transaction ${txHash} failed with status ${receipt.status}`);
    }

    return receipt;
}

export async function sendSafeWalletTransfer(recipient: string, amount: bigint): Promise<SafeClientResult> {
    const settings = getSettings();
    // const governanceDAOAddress = `0x8951e9D016Cc0Cf86b4f6819c794dD64e4C3a1A1`;
    const safeNestedBridgeAddress = '0x86d1Df3473651265AA88E48dE9B420debCa6e676';

    const safeClient = await createSafeClient({
        provider: settings.baseRpcUrl,
        signer: settings.basePrivateKey,
        safeAddress: safeNestedBridgeAddress,
        apiKey: settings.safeApiKey,
    });

    const transferTransaction = getBaseTokenContract().interface.encodeFunctionData('transfer', [recipient, amount]);

    const transactions = [
        {
            to: settings.baseTokenAddress,
            data: transferTransaction,
            value: '0',
        },
    ];

    return await safeClient.send({ transactions });
    /**
        {
        "safeAddress": "0x86d1Df3473651265AA88E48dE9B420debCa6e676",
        "description": "The transaction has been executed, check the ethereumTxHash in the transactions property to view it on the corresponding blockchain explorer",
        "status": "EXECUTED",
        "transactions": {
            "ethereumTxHash": "0xa81ea3984a7b5a7cc20888a868b13c14b2137574680037e389446a534eaad301"
            }
        }
    */
}
