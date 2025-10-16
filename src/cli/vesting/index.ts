import { PrivateKey } from '@wharfkit/antelope';
import { printCliHelp } from '..';
import { AccountType, TonomyUsername } from '../../sdk';
import {
    assetToAmount,
    createSigner,
    EosioTokenContract,
    getAccount,
    getAccountNameFromUsername,
    getVestingContract,
} from '../../sdk/services/blockchain';
import settings from '../settings';

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

        const vestingSettings = await getVestingContract().getSettings();

        console.log('settings', vestingSettings);

        const res = await getVestingContract().assignTokens(sender, recipient, quantity, categoryId, signer);

        console.log('Transaction ID: ', JSON.stringify(res, null, 2));
    } else if (args[0] === 'audit') {
        const uniqueHolders = await getVestingContract().getAllUniqueHolders(true);

        console.log('');
        console.log('Unique holders: ', uniqueHolders);

        console.log('');
        const allAllocations = await getVestingContract().getAllAllocations(uniqueHolders, true);
        const totalVested = allAllocations.reduce(
            (previous, allocation) => (previous += assetToAmount(allocation.tokensAllocated)),
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

        await getVestingContract().setSettings('2024-04-30T12:00:00', '2030-01-01T00:00:00', signer);
    } else {
        printCliHelp();
        throw new Error(`Unknown command ${args[0]}`);
    }
}
