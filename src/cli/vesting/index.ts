import { PrivateKey } from '@wharfkit/antelope';
import { printCliHelp } from '..';
import { AccountType, TonomyUsername, VestingContract } from '../../sdk';
import {
    assetToAmount,
    createSigner,
    EosioTokenContract,
    getAccount,
    getAccountNameFromUsername,
    VestingAllocationRaw,
} from '../../sdk/services/blockchain';
import { getSettings } from '../../sdk/util/settings';
import settings from '../settings';

const vestingContract = VestingContract.Instance;

export async function getAllUniqueHolders(print = false): Promise<Set<string>> {
    const action = 'assigntokens';
    const contract = 'vesting.tmy';
    const limit = 100;
    let skip = 0;
    let actionsFound = 0;

    const uniqueHolders = new Set<string>();

    let host = 'pangea.eosusa.io';

    if (getSettings().environment === 'testnet') {
        host = 'test.pangea.eosusa.io';
    } else if (getSettings().environment !== 'production') {
        throw new Error(`environment ${getSettings().environment} not supported for fetching all vesting holders`);
    }

    do {
        const url = `https://${host}/v2/history/get_actions?act.name=${action}&sort=desc&skip=${skip}&limit=${limit}&account=${contract}&global_sequence=0-45539775`;
        const res = await fetch(url);
        const data = await res.json();
        const actions = data.actions;

        actionsFound = data?.actions?.length || 0;

        for (const action of actions) {
            const { sender, holder, amount, category } = action.act.data;

            uniqueHolders.add(holder);

            if (print)
                console.log(`${action.timestamp}: Sent ${amount} from ${sender} to ${holder} in category ${category}`);
        }

        skip += limit;
    } while (actionsFound > 0);

    return uniqueHolders;
}

interface VestingAllocationAndAccount extends VestingAllocationRaw {
    account: string;
}

export async function getAllAllocations(accounts: Set<string>, print = false): Promise<VestingAllocationAndAccount[]> {
    const allocations: VestingAllocationAndAccount[] = [];

    for (const account of accounts) {
        const accountAllocations = await vestingContract.getAllocations(account);

        for (const allocation of accountAllocations) {
            // eslint-disable-next-line camelcase
            const { id, tokens_allocated, vesting_category_type } = allocation;

            if (print)
                console.log(
                    // eslint-disable-next-line camelcase
                    `Holder ${account}: Allocation ${id}: ${tokens_allocated} in category ${vesting_category_type}`
                );
            allocations.push({ account, ...allocation });
        }
    }

    return allocations;
}

export default async function vesting(args: string[]) {
    if (args[0] === 'assign') {
        const privateKey = PrivateKey.from(process.env.SIGNING_KEY || '');
        const signer = createSigner(privateKey);

        const sender = args[1] as string;
        let recipient = args[2] as string;
        const quantity = args[3] as string;
        const categoryId = Number(args[4] as string);

        if (recipient.startsWith('@')) {
            console.log('Searching for username: ', recipient);
            const usernameInstance = TonomyUsername.fromUsername(
                recipient.slice(1),
                AccountType.PERSON,
                settings.config.accountSuffix
            );

            recipient = (await getAccountNameFromUsername(usernameInstance)).toString();
        } else {
            console.log('Searching for account name: ', recipient);
            await getAccount(recipient);
        }

        console.log('Account name: ', recipient.toString());

        console.log('Assigning tokens to: ', {
            sender,
            holder: recipient,
            quantity,
            categoryId,
        });

        const vestingSettings = await vestingContract.getSettings();

        console.log('settings', vestingSettings);

        const res = await vestingContract.assignTokens(sender, recipient, quantity, categoryId, signer);

        console.log('Transaction ID: ', JSON.stringify(res, null, 2));
    } else if (args[0] === 'audit') {
        const uniqueHolders = await getAllUniqueHolders(true);

        console.log('');
        console.log('Unique holders: ', uniqueHolders);

        console.log('');
        const allAllocations = await getAllAllocations(uniqueHolders, true);
        const totalVested = allAllocations.reduce(
            (previous, allocation) => (previous += assetToAmount(allocation.tokens_allocated)),
            0
        );

        console.log('');
        console.log('Total unique holders: ', uniqueHolders.size);
        console.log('Total vesting allocations: ', allAllocations.length);
        console.log(
            `Total vested: ${totalVested} TONO (${((100 * totalVested) / EosioTokenContract.TOTAL_SUPPLY).toFixed(2)}%)`
        );
        console.log('');
    } else if (args[0] === 'setsettings') {
        const privateKey = PrivateKey.from(process.env.SIGNING_KEY || '');
        const signer = createSigner(privateKey);

        await vestingContract.setSettings('2024-04-30T12:00:00', '2030-01-01T00:00:00', signer);
    } else {
        printCliHelp();
        throw new Error(`Unknown command ${args[0]}`);
    }
}
