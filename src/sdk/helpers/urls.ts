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
    requests.external.checkReferrerOrigin();

    return requests;
}

export function isSameOrigin(a: string | URL, b: string | URL): boolean {
    const urlA = new URL(a);
    const urlB = new URL(b);

    return urlA.origin === urlB.origin;
}

export function parseCallbackPath(callbackPath: string): {
    path: string;
    params: Record<string, string>;
    fragment: string;
} {
    const url = new URL(callbackPath, 'http://dummybase'); // base is required for relative URLs
    const path = url.pathname;
    const params: Record<string, string> = {};

    url.searchParams.forEach((value, key) => {
        params[key] = value;
    });
    const fragment = url.hash ? url.hash.substring(1) : ''; // remove the leading '#'

    return { path, params, fragment };
}

export function createUrl(base: string, path: string, params: Record<string, string>, fragment: string): string {
    const url = new URL(path, base);

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });

    if (fragment) {
        url.hash = fragment;
    }

    return url.toString();
}
