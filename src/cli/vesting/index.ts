import { PrivateKey } from '@wharfkit/antelope';
import { printCliHelp } from '..';
import { AccountType, TonomyContract, TonomyUsername, VestingContract } from '../../sdk';
import { createSigner } from '../../sdk/services/blockchain';
import { setSettings } from '../../sdk/util/settings';
import settings from '../bootstrap/settings';

setSettings(settings.config);

const tonomyContract = TonomyContract.Instance;
const vestingContract = VestingContract.Instance;

export default async function vesting(args: string[]) {
    if (args[0] === 'assign') {
        const privateKey = PrivateKey.from(process.env.SIGNING_KEY || '');
        const signer = createSigner(privateKey);
        const username = args[1];

        console.log('Searching for username: ', username);

        const usernameInstance = TonomyUsername.fromUsername(
            username,
            AccountType.PERSON,
            settings.config.accountSuffix
        );
        const { account_name: account } = await tonomyContract.getPerson(usernameInstance);

        console.log('Account name: ', account.toString());

        const amount = Number(args[2]);
        const quantity = amount.toFixed(0) + '.000000 LEOS';
        const categoryId = 8;
        const sender = 'coinsale.tmy';
        const holder = account.toString();

        console.log('Assigning tokens to: ', {
            username,
            accountName: holder,
            quantity,
            categoryId,
        });

        const vestingSettings = await vestingContract.getSettings();

        console.log('settings', vestingSettings);

        const res = await vestingContract.assignTokens(sender, holder, quantity, categoryId, signer);

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
