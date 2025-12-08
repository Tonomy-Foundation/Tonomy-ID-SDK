import Decimal from 'decimal.js';
import { Communication, SwapSubscriber } from '../sdk/services/communication/communication';
import { extractProofMessage, tonomyToBaseTransfer } from '../sdk/services/ethereum';
import { KeyManager } from '../sdk/storage/keymanager';
import { StorageFactory } from '../sdk/storage/storage';
import { SwapTokenMessage, SwapTokenMessagePayload } from '../sdk/services/communication/message';
import { SdkErrors, throwError } from '../sdk/util/errors';
import { ExternalUser } from './externalUser';
import { getAccountNameFromDid, getSettings, randomString } from '../sdk';
import { ethers } from 'ethers';

export class AppsExternalUser extends ExternalUser {
    constructor(user: ExternalUser) {
        const exposedUser = user as unknown as {
            keyManager: KeyManager;
            storageFactory: StorageFactory;
            communication: Communication;
        };

        super(exposedUser.keyManager, exposedUser.storageFactory);
        this.did = user.did;
    }

    /**
     * Sends a swap message to the communication service
     *
     * @param {SwapTokenMessage} message - the message to send
     */
    private async sendSwapMessage(message: SwapTokenMessage): Promise<void> {
        await this.loginToCommunication();
        const res = await this.communication.sendSwapMessage(message);

        if (!res) throwError('Failed to send message', SdkErrors.MessageSendError);
    }

    /**
     * Service to swap $TONO from Base and Tonomy blockchain.
     *
     * @param {Decimal} amount amount to swap
     * @param { { message: string; signature: string } } proof contains message and signature
     * @param { 'base' | 'tonomy' } destination Either "base" or "tonomy"
     */
    async swapTonomyToBaseToken(
        amount: Decimal,
        proof: { message: string; signature: string },
        // eslint-disable-next-line camelcase
        _testOnly_tonomyAppsWebsiteUsername?: string
    ): Promise<void> {
        const { address } = extractProofMessage(proof.message);

        const payload: SwapTokenMessagePayload = {
            amount,
            baseAddress: address,
            proof,
            // eslint-disable-next-line camelcase
            _testOnly_tonomyAppsWebsiteUsername: _testOnly_tonomyAppsWebsiteUsername,
        };

        const issuer = await this.getIssuer();
        const swapMessage = await SwapTokenMessage.signMessage(payload, issuer, address);

        return await this.sendSwapMessage(swapMessage);
    }

    /**
     * Swaps $TONO tokens from Tonomy chain to Base chain.
     *
     * @param {Decimal} amount - Amount of $TONO tokens to swap
     * @param {Signer} signer - Signer object for transaction authorization
     */
    async swapBaseToTonomyToken(amount: Decimal, signer: ethers.Signer): Promise<boolean> {
        const issuer = await this.getIssuer();
        const tonomyAccount = getAccountNameFromDid(issuer.did);

        const memo = createSwapMemo(tonomyAccount.toString());

        const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
        let id: number | undefined;

        const waitForSwap = new Promise<boolean>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                if (id !== undefined) {
                    this.communication.unsubscribeSwapBaseToTonomy(id);
                }

                reject(new Error('Swap subscriber timed out after 2 minutes'));
            }, TIMEOUT_MS);

            const newHandler: SwapSubscriber = async (memo: string): Promise<void> => {
                try {
                    console.log('wait for swap to tonomy', memo);
                    resolve(true);
                } catch (error) {
                    reject(error);
                } finally {
                    clearTimeout(timeoutId);

                    if (id !== undefined) {
                        this.communication.unsubscribeSwapBaseToTonomy(id);
                    }
                }
            };

            id = this.communication.subscribeSwapBaseToTonomy(newHandler);
        });

        const { baseMintBurnAddress } = getSettings();

        // 2. Send the transaction
        await tonomyToBaseTransfer(baseMintBurnAddress, amount, memo, signer);

        // 3. Now wait for the event
        return await waitForSwap;
    }
}

export function createSwapMemo(tonomyAccount: string): string {
    const swapId = randomString(8);

    return `swap:${swapId}:${tonomyAccount}`;
}

export function parseSwapMemo(memo: string): { swapId: string; tonomyAccount: string } {
    const parts = memo.split(':');

    if (parts.length !== 3 || parts[0] !== 'swap') {
        throw new Error(`Invalid swap memo format: ${memo}`);
    }

    return {
        swapId: parts[1],
        tonomyAccount: parts[2],
    };
}
