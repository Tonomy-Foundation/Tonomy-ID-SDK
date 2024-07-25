import { APIClient, FetchProvider, NameType, API, PrivateKey, Serializer } from '@wharfkit/antelope';
import { GetInfoResponse } from '@wharfkit/antelope/src/api/v1/types';
import fetch from 'cross-fetch';
import { getSettings, isProduction } from '../../../util/settings';
import { throwError, SdkErrors } from '../../../util/errors';

let api: APIClient;

export async function getApi(): Promise<APIClient> {
    if (api) return api;

    const settings = getSettings();

    api = new APIClient({
        url: settings.blockchainUrl,
        provider: new FetchProvider(settings.blockchainUrl, { fetch }),
    });
    if (!api) throwError('Could not create API client', SdkErrors.CouldntCreateApi);
    return api;
}

/**
 * This function serializes one action into hex string
 *
 * @param {string} account - name of the contract account to pull the ABI from
 * @param {string } type - name of the action that will be executed
 * @param {object} data - data of the action that will be executed
 * @returns {string} - hex string of the serialized action
 */
export async function serializeActionData(account: string, type: string, data: object): Promise<string> {
    const { abi } = await (await getApi()).v1.chain.get_abi(account);

    if (!abi) {
        throw new Error(`No ABI for ${account}`);
    }

    const { hexString } = Serializer.encode({ object: data, abi, type });

    return hexString;
}

export async function getChainInfo(): Promise<GetInfoResponse> {
    const api = await getApi();

    return (await api.v1.chain.get_info()) as unknown as GetInfoResponse;
}

export async function getAccount(account: NameType): Promise<API.v1.AccountObject> {
    try {
        const api = await getApi();

        return await api.v1.chain.get_account(account);
    } catch (e) {
        if (e.message === 'Account not found at /v1/chain/get_account') {
            throwError('Account "' + account.toString() + '" not found', SdkErrors.AccountDoesntExist);
        } else {
            throw e;
        }
    }
}

export async function getProducers(): Promise<API.v1.GetProducerScheduleResponse> {
    const api = await getApi();

    return await api.v1.chain.get_producer_schedule();
}

export function getTonomyOperationsKey(): PrivateKey {
    if (isProduction() && !process.env.TONOMY_OPS_PRIVATE_KEY)
        throw new Error('TONOMY_OPS_PRIVATE_KEY must be set in production');

    if (process.env.TONOMY_OPS_PRIVATE_KEY) {
        if (getSettings().loggerLevel === 'debug') console.log('Using TONOMY_OPS_PRIVATE_KEY from env');
        return PrivateKey.from(process.env.TONOMY_OPS_PRIVATE_KEY);
    }

    return PrivateKey.from('PVT_K1_24kG9VcMk3VkkgY4hh42X262AWV18YcPjBTd2Hox4YWoP8vRTU');
}
