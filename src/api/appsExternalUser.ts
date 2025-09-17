import Decimal from 'decimal.js';
import {
    Communication,
    extractProofMessage,
    KeyManager,
    SdkErrors,
    StorageFactory,
    SwapTokenMessage,
    SwapTokenMessagePayload,
    throwError,
} from '../sdk';
import { ExternalUser } from './externalUser';

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
        _testOnly_tonomyAppsWebsiteUsername?: string
    ): Promise<void> {
        const { address } = extractProofMessage(proof.message);

        const payload: SwapTokenMessagePayload = {
            amount,
            baseAddress: address,
            proof: proof,
            destination,
            _testOnly_tonomyAppsWebsiteUsername: _testOnly_tonomyAppsWebsiteUsername,
        };

        const issuer = await this.getIssuer();
        const swapMessage = await SwapTokenMessage.signMessage(payload, issuer, address);

        return await this.sendSwapMessage(swapMessage);
    }
}
