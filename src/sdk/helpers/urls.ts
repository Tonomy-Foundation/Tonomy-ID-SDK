import { DualWalletRequests } from '../util/request';

/**
 * Verifies the WalletRequests received in the URL were successfully authorized by Tonomy ID
 *
 * @description should be called in the callback page of the Tonomy Accounts (SSO) website
 * (which is why this is NOT a member function of the DualWalletRequests class).
 *
 * @returns {Promise<WalletRequest[]>} - the verified WalletRequests
 */
export async function onRedirectLogin(): Promise<DualWalletRequests> {
    const requests = DualWalletRequests.fromUrl();

    await requests.verify();
    if (requests.external) requests.external.checkReferrerOrigin();

    return requests;
}
