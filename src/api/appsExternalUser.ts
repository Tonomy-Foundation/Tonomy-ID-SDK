import Decimal from 'decimal.js';
import { Communication } from '../sdk/services/communication/communication';
import { extractProofMessage } from '../sdk/services/ethereum';
import { KeyManager } from '../sdk/storage/keymanager';
import { StorageFactory } from '../sdk/storage/storage';
import {
    SwapBaseTokenMessage,
    SwapBaseTokenMessagePayload,
    SwapTokenMessage,
    SwapTokenMessagePayload,
} from '../sdk/services/communication/message';
import { SdkErrors, throwError } from '../sdk/util/errors';
import { ExternalUser } from './externalUser';
import { Signer } from 'ethers';

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
    async sendSwapMessage(message: SwapTokenMessage): Promise<void> {
        await this.loginToCommunication();
        const res = await this.communication.sendSwapMessage(message);

        if (!res) throwError('Failed to send message', SdkErrors.MessageSendError);
    }

    /**
     * Service to swap $TONO between Base and Tonomy chains.
     *
     * @param {Decimal} amount amount to swap
     * @param { { message: string; signature: string } } proof contains message and signature
     * @param { 'base' | 'tonomy' } destination Either "base" or "tonomy"
     */
    async swapToken(
        amount: Decimal,
        proof: { message: string; signature: string },
        destination: 'base' | 'tonomy',
        // eslint-disable-next-line camelcase
        _testOnly_tonomyAppsWebsiteUsername?: string
    ): Promise<void> {
        const { address } = extractProofMessage(proof.message);

        const payload: SwapTokenMessagePayload = {
            amount,
            baseAddress: address,
            proof: proof,
            destination,
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
     * @param {string} memo - Optional memo/note for the swap transaction
     * @param {string} baseAddress - Recipient address on Base chain
     * @param {Signer} signer - Signer object for transaction authorization
     */

    async swapBaseToken(amount: Decimal, memo: string, baseAddress: string, signer: Signer): Promise<void> {
        const payload: SwapBaseTokenMessagePayload = {
            amount,
            baseAddress,
            memo,
            signer: signer,
        };

        const issuer = await this.getIssuer();
        const swapMessage = await SwapBaseTokenMessage.signMessage(payload, issuer, baseAddress);

        return await this.sendSwapMessage(swapMessage);
    }
}
