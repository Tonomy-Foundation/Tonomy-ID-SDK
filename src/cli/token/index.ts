import { Checksum256, Name, PrivateKey } from '@wharfkit/antelope';
import { AccountType, TonomyUsername, EosioTokenContract } from '../../sdk';
import { assetToAmount, createSigner, getAccount, getAccountNameFromUsername } from '../../sdk/services/blockchain';
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

    const sender = args[0] as string;
    let recipient = args[1] as string;
    const quantity = args[2] as string;
    const memo = (args[3] as string) || '';

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
        from: sender,
        to: recipient,
        quantity,
        memo,
    });

    const res = await tokenContract.transfer(sender, recipient, quantity, memo, signer);

    console.log('Transaction ID: ', JSON.stringify(res, null, 2));
}

interface AccountTokenData {
    description: string;
    tokens: Decimal;
    vested: Decimal;
}

const ZERO_DECIMAL = new Decimal(0);
const LEOS_SUPPLY_DECIMAL = new Decimal(EosioTokenContract.TOTAL_SUPPLY);

export async function audit() {
    console.log('');
    console.log('Fetching tokens for bootstrap accounts');
    const bootstrappedAccounts = new Set<string>();

    bootstrappedAccounts.add(foundAccount);
    bootstrappedAccounts.add(operationsAccount);
    bootstrappedAccounts.add(systemAccount);
    for (const account of foundControlledAccounts) bootstrappedAccounts.add(account);
    for (const account of opsControlledAccounts) bootstrappedAccounts.add(account);

    const bootstrappedData = new Map<string, AccountTokenData>();

    await Promise.all(
        Array.from(bootstrappedAccounts).map(async (account) => {
            const balance = new Decimal(await tokenContract.getBalance(account));

            bootstrappedData.set(account, {
                description: 'Bootstrapped',
                tokens: balance,
                vested: ZERO_DECIMAL,
            });
        })
    );

    bootstrappedData.forEach((data, account) => {
        const fraction = data.tokens.div(LEOS_SUPPLY_DECIMAL).mul(100).toFixed(8) + '%';

        console.log(`${account.padEnd(14)} ${data.tokens.toFixed(4).padStart(15)} LEOS (${fraction.padStart(12)})`);
    });

    console.log('');
    console.log('Fetching vested tokens');
    const vestingHolders = await getAllUniqueHolders();
    const vestingAllocations = await getAllAllocations(vestingHolders);
    const vestingCategories = vestingAllocations.reduce<number[]>((previous, allocation) => {
        if (previous.includes(allocation.vesting_category_type)) return previous;
        else return [...previous, allocation.vesting_category_type];
    }, []);
    const vestedTokensPerCategory = vestingCategories.reduce<Map<number, Decimal>>(
        (map, category) => map.set(category, new Decimal(0)),
        new Map<number, Decimal>()
    );

    for (const allocation of vestingAllocations) {
        const categoryTokens = vestedTokensPerCategory.get(allocation.vesting_category_type);

        if (!categoryTokens) throw new Error('categoryTokens undefined');
        const allocationTokens = new Decimal(allocation.tokens_allocated.split(' ')[0]);

        vestedTokensPerCategory.set(allocation.vesting_category_type, categoryTokens.add(allocationTokens));
    }

    const totalVested = vestingAllocations.reduce(
        (previous, allocation) => (previous += assetToAmount(allocation.tokens_allocated)),
        0
    );

    console.log('Total unique holders: ', vestingHolders.size);
    console.log('Total vesting allocations: ', vestingAllocations.length);
    console.log(
        `Total vested:  ${totalVested.toFixed(4).padStart(15)} LEOS (${((100 * totalVested) / EosioTokenContract.TOTAL_SUPPLY).toFixed(8).padStart(11)}%)`
    );
    vestedTokensPerCategory.forEach((tokens, category) => {
        const fraction = tokens.mul(100).dividedBy(EosioTokenContract.TOTAL_SUPPLY).toFixed(8) + '%';

        console.log(
            `> category ${category.toString().padStart(2)}: ${tokens.toFixed(4).padStart(15)} LEOS (${fraction.padStart(12)})`
        );
    });

    console.log('');
    console.log('Fetching apps tokens');

    const apps = await getAllApps();

    const appAccounts = await Promise.all(
        apps.map(async (app) => {
            const balance = new Decimal(await tokenContract.getBalance(app.account_name));
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
    );

    const totalAllTokens = appAccounts.reduce((previous, app) => previous.add(app.tokens), ZERO_DECIMAL);

    console.log('Total apps', apps.length);
    console.log(
        `Total app tokens:  ${totalAllTokens.toFixed(4).padStart(14)} LEOS (${totalAllTokens.mul(100).dividedBy(EosioTokenContract.TOTAL_SUPPLY).toFixed(8).padStart(11)}%)`
    );

    console.log('');
    console.log('Fetching people tokens');
    const people = await getAllPeople();

    const peopleAccounts = [];
    const batchSize = 100;

    for (let i = 0; i < people.length; i += batchSize) {
        const batch = people.slice(i, i + batchSize);

        const batchResults = await Promise.all(
            batch.map(async (person) => {
                const balance = new Decimal(await tokenContract.getBalance(person.account_name));

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

    const totalPeopleTokens = peopleAccounts.reduce((previous, person) => previous.add(person.tokens), ZERO_DECIMAL);

    console.log('Total people', people.length);
    console.log(
        `Total people tokens:  ${totalPeopleTokens.toFixed(4).padStart(14)} LEOS (${totalPeopleTokens.mul(100).dividedBy(EosioTokenContract.TOTAL_SUPPLY).toFixed(8).padStart(11)}%)`
    );

    // TODO: check all staking allocations in staking contract
}

async function getAllApps() {
    const api = await getApi();
    const data = await api.v1.chain.get_table_rows({
        code: 'tonomy',
        scope: 'tonomy',
        table: 'apps',
        limit: 100,
    });

    return data.rows.map((row) => {
        return {
            app_name: row.app_name,
            description: row.description,
            logo_url: row.logo_url,
            origin: row.origin,
            account_name: Name.from(row.account_name),
            username_hash: Checksum256.from(row.username_hash),
            version: row.version,
        };
    });
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
