/* eslint-disable camelcase */
import { Name, PrivateKey } from '@wharfkit/antelope';
import { AccountType, TonomyUsername, EosioTokenContract, setSettings } from '../../sdk';
import {
    amountToSupplyPercentage,
    assetToDecimal,
    createSigner,
    getAccount,
    getAccountNameFromUsername,
    TonomyContract,
    vestingCategories as vestingCategoriesList,
} from '../../sdk/services/blockchain';
import { getApi } from '../../sdk/services/blockchain/eosio/eosio';
import settings from '../settings';
import {
    foundAccount,
    foundControlledAccounts,
    operationsAccount,
    opsControlledAccounts,
    systemAccount,
} from '../bootstrap';
import Decimal from 'decimal.js';
import { getAllAllocations, getAllUniqueHolders } from '../vesting';

const tokenContract = EosioTokenContract.Instance;

export async function transfer(args: string[]) {
    const privateKey = PrivateKey.from(process.env.SIGNING_KEY || '');
    const signer = createSigner(privateKey);

    const sender = args[1] as string;
    let recipient = args[2] as string;
    const quantity = args[3] as string;
    const memo = (args[4] as string) || '';

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
        from: sender,
        to: recipient,
        quantity,
        memo,
    });

    const res = await tokenContract.transfer(sender, recipient, quantity, memo, signer);

    console.log('Transaction ID: ', JSON.stringify(res, null, 2));
}

const ZERO_DECIMAL = new Decimal(0);

type AccountBalance = {
    account: string;
    tokens: Decimal;
    vested: Decimal;
} & Record<string, any>;

export async function audit() {
    const symbol = 'LEOS';

    console.log('Token symbol:', symbol);

    setSettings({
        ...settings.config,
        currencySymbol: symbol,
    });

    console.log('');
    console.log('Fetching tokens for bootstrap accounts');
    const bootstrappedAccounts = new Set<string>();

    bootstrappedAccounts.add(foundAccount);
    bootstrappedAccounts.add(operationsAccount);
    bootstrappedAccounts.add(systemAccount);
    if (settings.env === 'production') bootstrappedAccounts.add('advteam.tmy');
    for (const account of foundControlledAccounts) bootstrappedAccounts.add(account);
    for (const account of opsControlledAccounts) bootstrappedAccounts.add(account);

    const bootstrappedData: AccountBalance[] = (
        await Promise.all(
            Array.from(bootstrappedAccounts).map(async (account) => {
                const balance = await tokenContract.getBalanceDecimal(account);

                return {
                    account,
                    description: 'Bootstrapped',
                    tokens: balance,
                    vested: ZERO_DECIMAL,
                };
            })
        )
    ).sort((a, b) => b.tokens.cmp(a.tokens));

    bootstrappedData.forEach(({ account, tokens }) => {
        const fraction = amountToSupplyPercentage(tokens);

        console.log(`${account.padEnd(14)} ${tokens.toFixed(4).padStart(16)} ${symbol} (${fraction.padStart(12)})`);
    });

    const totalBoostrappedTokens = bootstrappedData.reduce(
        (previous, account) => previous.add(account.tokens),
        ZERO_DECIMAL
    );

    console.log(
        `Total bootstrapped tokens:  ${totalBoostrappedTokens.toFixed(4).padStart(14)} ${symbol} (${amountToSupplyPercentage(totalBoostrappedTokens).padStart(10)})`
    );

    console.log('');
    console.log('Fetching vested tokens');
    const vestingHolders = await getAllUniqueHolders();
    let vestingAllocations: AccountBalance[] = [];

    try {
        vestingAllocations = (await getAllAllocations(vestingHolders)).map((allocation) => {
            return {
                account: allocation.account,
                description: 'Vesting',
                tokens: ZERO_DECIMAL,
                vested: assetToDecimal(allocation.tokens_allocated),
                category: allocation.vesting_category_type,
            };
        });

        const vestingCategories = vestingAllocations.reduce<number[]>((previous, allocation) => {
            if (previous.includes(allocation.category)) return previous;
            else return [...previous, allocation.category];
        }, []);
        const vestedTokensPerCategory = vestingCategories.reduce<Map<number, Decimal>>(
            (map, category) => map.set(category, ZERO_DECIMAL),
            new Map<number, Decimal>()
        );

        for (const allocation of vestingAllocations) {
            const categoryTokens = vestedTokensPerCategory.get(allocation.category);

            if (!categoryTokens) throw new Error('categoryTokens undefined');

            vestedTokensPerCategory.set(allocation.category, categoryTokens.add(allocation.vested));
        }

        const totalVested = vestingAllocations.reduce(
            (previous, allocation) => previous.add(allocation.vested),
            ZERO_DECIMAL
        );

        console.log('Total unique holders: ', vestingHolders.size);
        console.log('Total vesting allocations: ', vestingAllocations.length);
        console.log(
            `Total vested:  ${totalVested.toFixed(4).padStart(15)} ${symbol} (${amountToSupplyPercentage(totalVested).padStart(12)})`
        );
        vestedTokensPerCategory.forEach((tokens, category) => {
            const fraction = amountToSupplyPercentage(tokens);
            const categoryName = vestingCategoriesList.get(category)?.name;

            console.log(
                `> category ${category.toString().padStart(2)}: ${tokens.toFixed(4).padStart(15)} ${symbol} (${fraction.padStart(12)}) ${categoryName}`
            );
        });
    } catch (e) {
        if (e.message.includes('Invalid currency symbol')) {
            console.log('Vesting allocations with invalid currency symbol found', e.message);
            console.log('Skipping vesting allocations');
        } else {
            console.error('Error fetching vesting allocations', e);
            throw e;
        }
    }

    console.log('');
    console.log('Fetching apps tokens');

    const apps = await TonomyContract.Instance.getApps();

    const appAccounts: AccountBalance[] = (
        await Promise.all(
            apps.map(async (app) => {
                const balance = await tokenContract.getBalanceDecimal(app.account_name);
                const account = await getAccount(app.account_name);

                return {
                    account: app.account_name.toString(),
                    description: app.description,
                    tokens: balance,
                    vested: ZERO_DECIMAL,
                    ramQuota: account.ram_quota.toNumber(),
                    ramUsage: account.ram_usage.toNumber(),
                };
            })
        )
    ).sort((a, b) => b.tokens.cmp(a.tokens));

    const totalAllTokens = appAccounts.reduce((previous, app) => previous.add(app.tokens), ZERO_DECIMAL);

    console.log('Total apps', apps.length);
    console.log(
        `Total app tokens:  ${totalAllTokens.toFixed(4).padStart(14)} ${symbol} (${amountToSupplyPercentage(totalAllTokens).padStart(10)})`
    );

    for (const app of appAccounts) {
        if (app.tokens?.eq(ZERO_DECIMAL)) continue;
        const fraction = amountToSupplyPercentage(app.tokens);

        console.log(
            `> ${app.account.padEnd(14)} ${app.tokens.toFixed(4).padStart(16)} ${symbol} (${fraction.padStart(12)}) ${app.description}`
        );
    }

    console.log('');
    console.log('Fetching people tokens');
    const people = await getAllPeople();

    const peopleAccounts: AccountBalance[] = [];
    const batchSize = 100;

    for (let i = 0; i < people.length; i += batchSize) {
        const batch = people.slice(i, i + batchSize);

        const batchResults: AccountBalance[] = await Promise.all(
            batch.map(async (person) => {
                const balance = await tokenContract.getBalanceDecimal(person.account_name);

                return {
                    account: person.account_name,
                    description: person.status,
                    tokens: balance,
                    vested: ZERO_DECIMAL,
                };
            })
        );

        peopleAccounts.push(...batchResults);
    }

    peopleAccounts.sort((a, b) => b.tokens.cmp(a.tokens));

    const totalPeopleTokens = peopleAccounts.reduce((previous, person) => previous.add(person.tokens), ZERO_DECIMAL);

    console.log('Total people', people.length);
    console.log(
        `Total people tokens:  ${totalPeopleTokens.toFixed(4).padStart(14)} ${symbol} (${amountToSupplyPercentage(totalPeopleTokens).padStart(10)})`
    );

    for (const person of peopleAccounts) {
        if (person.tokens.eq(ZERO_DECIMAL)) continue;
        const fraction = amountToSupplyPercentage(person.tokens);

        console.log(
            `> ${person.account.toString().padEnd(14)} ${person.tokens.toFixed(4).padStart(15)} ${symbol} (${fraction.padStart(12)})`
        );
    }

    console.log('');
    console.log('Fetching producer tokens');

    const producerAccounts = ['prod1.tmy', 'prod2.tmy', 'prod3.tmy'];
    const producers: AccountBalance[] = [];

    if (settings.env === 'production') producerAccounts.push('stakeworks', 'bp.adex', 'eosusa', 'eosiodetroit');

    for (const producer of producerAccounts) {
        const balance = await tokenContract.getBalanceDecimal(producer);

        producers.push({
            account: producer,
            description: 'Block Producer',
            tokens: balance,
            vested: ZERO_DECIMAL,
        });
    }

    const producerTokens = producers.reduce((previous, producer) => previous.add(producer.tokens), ZERO_DECIMAL);

    console.log('Total producers', producerAccounts.length);
    console.log(
        `Total producer tokens:  ${producerTokens.toFixed(4).padStart(14)} ${symbol} (${amountToSupplyPercentage(producerTokens).padStart(10)})`
    );

    console.log('');
    console.log('Calculating all tokens');

    const allUniqueAccounts: Map<string, AccountBalance> = [
        ...vestingAllocations, // TODO: for this list to work in any order, vestingAllocations data needs to fetch (unvested) token balance as well
        ...appAccounts,
        ...peopleAccounts,
        ...producers,
        ...bootstrappedData,
    ].reduce((map, account) => map.set(account.account, account), new Map<string, AccountBalance>());

    const allTokens = Array.from(allUniqueAccounts.values()).reduce(
        (previous, account) => previous.add(account.tokens),
        ZERO_DECIMAL
    );

    console.log('Total unique accounts: ', allUniqueAccounts.size);
    console.log(
        `Total tokens:  ${allTokens.toFixed(4).padStart(14)} ${symbol} (${amountToSupplyPercentage(allTokens).padStart(10)})`
    );
    console.log(`Token supply: ${EosioTokenContract.TOTAL_SUPPLY.toFixed(4).padStart(14)} ${symbol}`);

    // TODO: check all staking allocations in staking contract
}

async function getAllPeople(print = false) {
    const api = await getApi();

    const limit = 100;
    let lowerBound = Name.from('1');
    let peopleFound = 0;

    const people: any[] = [];

    do {
        if (print) console.log(`get_table_rows: people, ${limit}, ${lowerBound.toString()}`);
        const data = await api.v1.chain.get_table_rows({
            code: 'tonomy',
            scope: 'tonomy',
            table: 'people',
            limit,
            lower_bound: lowerBound,
        });

        const rows = data.rows;

        peopleFound = rows.length;

        people.push(
            ...rows.map((row) => {
                return {
                    account_name: row.account_name,
                    status: row.status,
                    username_hash: row.username_hash,
                    password_salt: row.password_salt,
                    version: row.version,
                };
            })
        );

        lowerBound = Name.from(rows[rows.length - 1].account_name);
    } while (peopleFound === limit);

    return people;
}
