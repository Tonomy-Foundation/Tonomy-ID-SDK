import { APIClient, FetchProvider, PrivateKey, Name } from '@wharfkit/antelope';
import fetch from 'cross-fetch';
import { getSettings } from '../../src/sdk';
import { Authority, createSigner, transact } from '../../src/sdk/services/blockchain';

export const api = new APIClient({
    url: getSettings().blockchainUrl,
    provider: new FetchProvider(getSettings().blockchainUrl, { fetch }),
});

export function randomAccountName(): string {
    // replace all digits 06789 with another random digit
    return ('test' + Math.floor(Math.random() * 100000000)).replace(/[06789]/g, (x) =>
        Math.ceil(Math.random() * 5).toString()
    );
}

export async function createRandomAccount(authority: Authority) {
    const newAccountName = randomAccountName();

    const createAccountAction = {
        account: 'tonomy',
        name: 'newaccount',
        authorization: [
            {
                actor: 'tonomy',
                permission: 'owner',
            },
        ],
        data: {
            creator: 'tonomy',
            name: newAccountName,
            owner: authority,
            active: authority,
        },
    };

    await transact(Name.from('tonomy'), [createAccountAction], tonomyBoardSigners.slice(0, 2));

    return { name: newAccountName };
}

const tonomyBoardKeys = [
    'PVT_K1_YUpMM1hPec78763ADBMK3gJ4N3yUFi3N8dKRQ3nyYcxqoDnmL',
    'PVT_K1_2BvbQ8rQ55eTtUqaohjKZViUCupsDtbwhUsEmn3dTaZymAdXKp',
    'PVT_K1_2KjVtHQaBXydUidyoEdjbLw44DZBaQbFdNB6GmQHPzoXQqsTyp',
];

export const tonomyBoardAccounts = ['1.found.tmy', '2.found.tmy', '3.found.tmy'];
export const tonomyBoardPrivateKeys = tonomyBoardKeys.map((key) => PrivateKey.from(key));
export const tonomyBoardSigners = tonomyBoardPrivateKeys.map((key) => createSigner(key));
