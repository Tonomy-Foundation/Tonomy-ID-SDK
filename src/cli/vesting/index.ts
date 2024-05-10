import { AccountType, TonomyContract, TonomyUsername, VestingContract } from '../../sdk';
import { createSigner, getTonomyOperationsKey } from '../../sdk/services/blockchain';
import { setSettings } from '../../sdk/util/settings';
import settings from '../bootstrap/settings';
import { addSeconds } from '../../sdk/util';

setSettings(settings.config);

const tonomyContract = TonomyContract.Instance;
const vestingContract = VestingContract.Instance;

export default async function vesting(args: string[]) {
    if (args[0] === 'assign') {
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
        const categoryId = 1;
        const sender = 'coinsale.tmy';
        const holder = account.toString();

        const tonomyOpsKey = getTonomyOperationsKey();
        const signer = createSigner(tonomyOpsKey);
        const saleStartDate = new Date();
        const saleStart = saleStartDate.toISOString();
        const launchStartDate = addSeconds(saleStartDate, 5);
        const launchStart = launchStartDate.toISOString();

        await vestingContract.setSettings(saleStart, launchStart, signer);
        console.log('Assigning tokens to: ', {
            username,
            accountName: holder,
            quantity,
            categoryId,
        });

        const res = await vestingContract.assignTokens(sender, holder, quantity, categoryId, signer);

        console.log('Transaction ID: ', JSON.stringify(res, null, 2));
    } else {
        throw new Error(`Unknown command ${args[0]}`);
    }
}
