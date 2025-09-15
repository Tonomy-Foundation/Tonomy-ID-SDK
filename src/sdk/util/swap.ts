import Decimal from 'decimal.js';
import { extractProofMessage } from '../services/ethereum';
import { SwapTokenMessage, SwapTokenMessagePayload } from '../services/communication/message';
import { ExternalUser } from '../../api/externalUser';

/**
 * Service to swap $TONO between Base and Tonomy chains.
 */
export class SwapService {
    private user: ExternalUser;

    constructor(user: ExternalUser) {
        this.user = user;
    }

    /**
     * Swap tokens between Base and Tonomy chains
     *
     * @param amount Decimal amount to swap
     * @param proof contains message and signature
     * @param destination Either "base" or "tonomy"
     */
    async swapToken(
        amount: Decimal,
        proof: { message: string; signature: string },
        destination: 'base' | 'tonomy'
    ): Promise<boolean> {
        const { address } = extractProofMessage(proof.message);

        const payload: SwapTokenMessagePayload = {
            amount,
            baseAddress: address,
            proof: proof,
            destination,
        };

        const issuer = await this.user.getIssuer();
        const swapMessage = await SwapTokenMessage.signMessage(payload, issuer, address);

        await this.user.sendSwapMessage(swapMessage);

        return true;
    }
}
