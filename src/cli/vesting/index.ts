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
    } else if (args[0] === 'setsettings') {
        const privateKey = PrivateKey.from(process.env.SIGNING_KEY || '');
        const signer = createSigner(privateKey);

        await vestingContract.setSettings('2024-04-30T12:00:00', '2030-01-01T00:00:00', signer);
    } else {
        printCliHelp();
        throw new Error(`Unknown command ${args[0]}`);
    }
}
