import { Name } from '@wharfkit/antelope';
import {
    AccountType,
    getTonomyContract,
    TonomyUsername,
    getAccountInfo,
    getTokenContract,
    getStakingContract,
    getVestingContract,
    vestingCategories,
    assetToDecimal,
    formatAssetString,
} from '../../sdk';
import settings from '../settings';
import Decimal from 'decimal.js';

async function getAccount(username: string): Promise<Name> {
    if (username.startsWith('@')) {
        console.log('Searching for username: ', username);

        const usernameInstance = TonomyUsername.fromUsername(
            username.split('@')[1],
            AccountType.PERSON,
            settings.config.accountSuffix
        );
        const { accountName } = await getTonomyContract().getPerson(usernameInstance);

        console.log('Account name: ', accountName.toString());
        return accountName;
    } else {
        console.log('Searching for account: ', username);

        const account = await getAccountInfo(Name.from(username));

        console.log('Account: ', JSON.stringify(account, null, 2));
        return Name.from(username);
    }
}

async function getAccountTokens(accountName: Name) {
    // Get token balance
    const balance = await getTokenContract().getBalanceDecimal(accountName);

    console.log('Token balances: ', formatAssetString(balance));

    // Get staked balance
    let totalStaked = new Decimal(0);

    try {
        const staked = await getStakingContract().getAccountState(accountName);

        console.log('Staked tokens:');
        totalStaked = new Decimal(staked.totalStaked);
        console.log('  Total Staked:     ', formatAssetString(staked.totalStaked));
        console.log('  Total Unlockable: ', formatAssetString(staked.totalUnlockable));
        console.log('  Total Unlocking:  ', formatAssetString(staked.totalUnlocking));
    } catch (e) {
        if (e.message.includes('Account not found in staking contract')) {
            console.log('Staked tokens: 0 ' + settings.config.currencySymbol);
        } else throw e;
    }

    // Get vested balance
    const vested = await getVestingContract().getAllocations(accountName);
    // Create a set, grouped by the category ID of the allocation
    const vestedByCategory = new Map<string, Decimal>();
    let totalTgeUnlocked = new Decimal(0);
    let totalVested = new Decimal(0);

    for (const allocation of vested) {
        const category = vestingCategories.get(allocation.vestingCategoryType);

        if (!category) throw new Error('Unknown vesting category type: ' + allocation.vestingCategoryType);

        const current = vestedByCategory.get(category.name) || new Decimal(0);

        vestedByCategory.set(category.name, current.add(assetToDecimal(allocation.tokensAllocated)));
        totalTgeUnlocked = totalTgeUnlocked.add(assetToDecimal(allocation.tokensAllocated).mul(category.tgeUnlock));
        totalVested = totalVested.add(assetToDecimal(allocation.tokensAllocated));
    }

    console.log('Vested tokens:');

    for (const [categoryName, totalAllocated] of vestedByCategory.entries()) {
        console.log('  Category: ' + categoryName.padEnd(22) + ': ', formatAssetString(totalAllocated));
    }

    console.log('  Total TGE Unlocked: ', formatAssetString(totalTgeUnlocked));
    console.log('  Total Vested:      ', formatAssetString(totalVested));
    const totalCoins = balance.add(totalStaked).add(totalVested);

    console.log('-------------------------------------');
    console.log('  Total Coins:      ', formatAssetString(totalCoins));
}

export default async function accounts(args: string[]) {
    if (args[0] === 'get') {
        const accountName = await getAccount(args[1]);

        await getAccountTokens(accountName);
    } else {
        throw new Error(`Unknown command ${args[0]}`);
    }
}
