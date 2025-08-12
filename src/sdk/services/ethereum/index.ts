import { ethers } from 'ethers';
import { getSettings } from '../../util/settings';
import TonomyTokenABI from './abi/TonomyToken.json';

/**
 * Creates and returns an ethers.Contract instance for the TonomyToken contract
 * with the provider and signer configured from settings
 *
 * @returns Configured ethers.Contract instance
 */
export function createTonomyTokenContract(): ethers.Contract {
    const settings = getSettings();

    const provider = new ethers.JsonRpcProvider(settings.baseRpcUrl, settings.baseNetwork, { staticNetwork: true });
    let signer: ethers.Signer | undefined;

    try {
        const privateKey = settings.basePrivateKey;

        if (!privateKey) {
            throw new Error('Private key not found');
        }

        signer = new ethers.Wallet(privateKey, provider);
    } catch (error) {
        throw new Error('Failed to create signer: ' + error);
    }

    return new ethers.Contract(settings.baseTokenAddress, TonomyTokenABI.abi, signer || provider);
}
