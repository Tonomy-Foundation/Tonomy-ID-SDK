import { PrivateKey } from '@wharfkit/antelope';
import { printCliHelp } from '..';
import { AccountType, TonomyUsername, VestingContract } from '../../sdk';
import { createSigner, getAccount, getAccountNameFromUsername } from '../../sdk/services/blockchain';
import { setSettings } from '../../sdk/util/settings';
import settings from '../bootstrap/settings';

setSettings(settings.config);

const vestingContract = VestingContract.Instance;

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
                recipient,
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
        const action = 'assigntokens';
        const contract = 'vesting.tmy';
        const limit = 100;
        let skip = 0;
        let actionsFound = 0;

        const uniqueHolders = new Set<string>();

        do {
            const url = `https://pangea.eosusa.io/v2/history/get_actions?act.name=${action}&sort=desc&skip=${skip}&limit=${limit}&account=${contract}&global_sequence=0-45539775`;
            const res = await fetch(url);
            const data = await res.json();
            const actions = data.actions;

            actionsFound = data?.actions?.length || 0;

            for (const action of actions) {
                const { sender, holder, amount, category } = action.act.data;

                uniqueHolders.add(holder);

                console.log(`${action.timestamp}: Sent ${amount} from ${sender} to ${holder} in category ${category}`);
            }

            skip += limit;
        } while (actionsFound > 0);

        console.log('');
        console.log('Unique holders: ', uniqueHolders);
        console.log('');

        for (const holder of uniqueHolders) {
            const allocations = await vestingContract.getAllocations(holder);

            for (const allocation of allocations) {
                // eslint-disable-next-line camelcase
                const { id, tokens_allocated, vesting_category_type } = allocation;

                console.log(
                    // eslint-disable-next-line camelcase
                    `Holder ${holder}: Allocation ${id}: ${tokens_allocated} LEOS in category ${vesting_category_type}`
                );
            }
        }
    } else if (args[0] === 'setsettings') {
        const privateKey = PrivateKey.from(process.env.SIGNING_KEY || '');
        const signer = createSigner(privateKey);

        await vestingContract.setSettings('2024-04-30T12:00:00', '2030-01-01T00:00:00', signer);
    } else {
        printCliHelp();
        throw new Error(`Unknown command ${args[0]}`);
    }
}
