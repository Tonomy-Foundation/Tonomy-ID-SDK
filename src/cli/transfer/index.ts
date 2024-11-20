import { PrivateKey } from '@wharfkit/antelope';
import { printCliHelp } from '..';
import { AccountType, TonomyUsername, EosioTokenContract } from '../../sdk';
import { createSigner, getAccount, getAccountNameFromUsername } from '../../sdk/services/blockchain';
import { setSettings } from '../../sdk/util/settings';
import settings from '../bootstrap/settings';

setSettings(settings.config);

const tokenContract = EosioTokenContract.Instance;

export default async function transfer(args: string[]) {
    if (args[0] === 'assign') {
        const privateKey = PrivateKey.from(process.env.SIGNING_KEY || '');
        const signer = createSigner(privateKey);

        let recipient = args[2] as string;

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

        const quantity = args[3] as string;
        const memo = (args[4] as string) || '';
        const sender = args[1] as string;

        console.log('Assigning tokens to: ', {
            from: sender,
            to: recipient,
            quantity,
            memo,
        });

        const res = await tokenContract.transfer(sender, recipient, quantity, memo, signer);

        console.log('Transaction ID: ', JSON.stringify(res, null, 2));
    } else {
        printCliHelp();
        throw new Error(`Unknown command ${args[0]}`);
    }
}
