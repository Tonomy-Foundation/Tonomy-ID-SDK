import { APIClient, FetchProvider, NameType, API, PrivateKey, ABI } from '@wharfkit/antelope';
import fetch from 'cross-fetch';
import { getFetch, getSettings, isProduction } from '../../../util/settings';
import { throwError, SdkErrors } from '../../../util/errors';
import { MILLISECONDS_IN_SECOND } from '../../../util/time';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:services:blockchain:eosio:eosio');

let api: APIClient;

export function getApi(): APIClient {
    if (api) return api;

    const blockchainUrl = getSettings().blockchainUrl;

    api = new APIClient({
        url: blockchainUrl,
        provider: new FetchProvider(blockchainUrl, { fetch: getFetch() || fetch }),
    });
    return api;
}

const DEFAULT_ABI_TTL = 60 * MILLISECONDS_IN_SECOND;
const abiCache = new Map<string, { abiPromise: Promise<API.v1.GetAbiResponse>; time: Date }>();

export async function fetchAbi(account: NameType, ttl: number = DEFAULT_ABI_TTL): Promise<ABI.Def> {
    const now = new Date();

    if (abiCache.has(account.toString())) {
        debug('Using cached ABI for', account.toString());
        const { abiPromise, time } = abiCache.get(account.toString())!;

        if (now.getTime() < time.getTime() + ttl) {
            const { abi } = await abiPromise;

            debug('Using cached ABI for', account.toString(), abi);
            if (!abi) throw new Error(`No ABI for ${account}`);
            return abi;
        }
    }

    const promise = getApi().v1.chain.get_abi(account);

    abiCache.set(account.toString(), { abiPromise: promise, time: now });
    const { abi } = await promise;

    if (!abi) throw new Error(`No ABI for ${account}`);
    return abi;
}

export async function getChainInfo(): Promise<API.v1.GetInfoResponse> {
    return await getApi().v1.chain.get_info();
}

let chainId: string | undefined;

export async function getChainId(): Promise<string> {
    if (chainId) return chainId;
    const info = await getChainInfo();

    if (!info || !info.chain_id) throw new Error('Chain ID not found in chain info');
    return (chainId = info.chain_id.toString());
}

export async function getAccount(account: NameType): Promise<API.v1.AccountObject> {
    try {
        return await getApi().v1.chain.get_account(account);
    } catch (e) {
        if (e.message === 'Account not found at /v1/chain/get_account') {
            throwError('Account "' + account.toString() + '" not found', SdkErrors.AccountDoesntExist);
        } else {
            throw e;
        }
    }
}

export async function getProducers(): Promise<API.v1.GetProducerScheduleResponse> {
    return await getApi().v1.chain.get_producer_schedule();
}

export function getTonomyOperationsKey(): PrivateKey {
    if (isProduction() && !process.env.TONOMY_OPS_PRIVATE_KEY)
        throw new Error('TONOMY_OPS_PRIVATE_KEY must be set in production');

    if (process.env.TONOMY_OPS_PRIVATE_KEY) {
        debug('Using TONOMY_OPS_PRIVATE_KEY from env');
        return PrivateKey.from(process.env.TONOMY_OPS_PRIVATE_KEY);
    }

    return PrivateKey.from('PVT_K1_24kG9VcMk3VkkgY4hh42X262AWV18YcPjBTd2Hox4YWoP8vRTU');
}
