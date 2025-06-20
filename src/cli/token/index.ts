/* eslint-disable no-console */
/* eslint-disable camelcase */
import { Name, PrivateKey } from '@wharfkit/antelope';
import { AccountType, TonomyUsername, EosioTokenContract, setSettings } from '../../sdk';
import {
    amountToSupplyPercentage,
    AppTableRecord,
    assetToAmount,
    assetToDecimal,
    createSigner,
    getAccount,
    getAccountNameFromUsername,
    TonomyContract,
    GetPersonResponse,
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
import { getAllAllocations } from '../vesting';

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

const symbol = 'TONO';

export async function audit() {
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

    const bootstrappedData = (
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
                    account: person.account_name.toString(),
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
    console.log('Fetching vested tokens');
    // const vestingHolders = await getAllUniqueHolders();
    const vestingHolders = people.reduce<Set<string>>((previous, person) => {
        previous.add(person.account_name.toString());
        return previous;
    }, new Set<string>());
    const vestingAllocations = await getAllAllocations(vestingHolders, false);
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
        const allocationTokens = assetToDecimal(allocation.tokens_allocated);

        vestedTokensPerCategory.set(allocation.vesting_category_type, categoryTokens.add(allocationTokens));
    }

    const totalVested = vestingAllocations.reduce(
        (previous, allocation) => (previous += assetToAmount(allocation.tokens_allocated)),
        0
    );

    console.log('Total unique holders: ', vestingHolders.size);
    console.log('Total vesting allocations: ', vestingAllocations.length);
    console.log(
        `Total vested:  ${totalVested.toFixed(4).padStart(15)} ${symbol} (${((100 * totalVested) / EosioTokenContract.TOTAL_SUPPLY).toFixed(8).padStart(11)}%)`
    );
    vestedTokensPerCategory.forEach((tokens, category) => {
        const fraction = amountToSupplyPercentage(tokens);
        const categoryName = vestingCategoriesList.get(category)?.name;

        console.log(
            `> category ${category.toString().padStart(2)}: ${tokens.toFixed(4).padStart(15)} ${symbol} (${fraction.padStart(12)}) ${categoryName}`
        );
    });

    await checkMissedVestingAllocations(bootstrappedAccounts, vestingHolders, apps, people);
    // TODO: check block producer accounts

    // TODO: check all staking allocations in staking contract
}

async function checkMissedVestingAllocations(
    bootstrappedAccounts: Set<string>,
    vestingHolders: Set<string>,
    apps: AppTableRecord[],
    people: GetPersonResponse[]
) {
    console.log('');
    console.log('Checking if any people have allocations that were not considered above');
    const peopleNotInVestingHolders: Set<string> = new Set();

    for (const person of people) {
        if (!vestingHolders.has(person.account_name.toString())) {
            peopleNotInVestingHolders.add(person.account_name.toString());
        }
    }

    const peopleNotInVestingHoldersAllocations = await getAllAllocations(peopleNotInVestingHolders, true);
    const totalPeopleNotInVestingHolders = peopleNotInVestingHoldersAllocations.reduce(
        (previous, allocation) => assetToDecimal(allocation.tokens_allocated).add(previous),
        ZERO_DECIMAL
    );
    const uniquePeopleNotInVestingHolders = peopleNotInVestingHoldersAllocations.reduce((previous, allocation) => {
        if (!previous.includes(allocation.account)) {
            return [...previous, allocation.account];
        } else {
            return previous;
        }
    }, [] as string[]);

    console.log('People not in vesting holders: ', Array.from(peopleNotInVestingHolders).length);
    console.log('Total allocations: ', peopleNotInVestingHoldersAllocations.length);
    console.log(
        `Total tokens: ${totalPeopleNotInVestingHolders.toFixed(4).padStart(14)} ${symbol} (${amountToSupplyPercentage(
            totalPeopleNotInVestingHolders
        ).padStart(10)})`
    );
    console.log('Unique people not in vesting holders: ', uniquePeopleNotInVestingHolders.length);

    console.log('');
    console.log('Checking if any apps have allocations that were not considered above');
    const appsNotInVestingHolders: Set<string> = new Set();

    for (const app of apps) {
        if (!vestingHolders.has(app.account_name.toString())) {
            appsNotInVestingHolders.add(app.account_name.toString());
        }
    }

    const appsNotInVestingHoldersAllocations = await getAllAllocations(appsNotInVestingHolders, true);
    const totalAppsNotInVestingHolders = appsNotInVestingHoldersAllocations.reduce(
        (previous, allocation) => assetToDecimal(allocation.tokens_allocated).add(previous),
        ZERO_DECIMAL
    );
    const uniqueAppsNotInVestingHolders = appsNotInVestingHoldersAllocations.reduce((previous, allocation) => {
        if (!previous.includes(allocation.account)) {
            return [...previous, allocation.account];
        } else {
            return previous;
        }
    }, [] as string[]);

    console.log('Apps not in vesting holders: ', Array.from(appsNotInVestingHolders).length);
    console.log('Total allocations: ', appsNotInVestingHoldersAllocations.length);
    console.log(
        `Total tokens: ${totalAppsNotInVestingHolders.toFixed(4).padStart(14)} ${symbol} (${amountToSupplyPercentage(
            totalAppsNotInVestingHolders
        ).padStart(10)})`
    );
    console.log('Unique apps not in vesting holders: ', uniqueAppsNotInVestingHolders.length);

    console.log('');
    console.log('Checking if any bootstrapped accounts have allocations that were not considered above');
    const bootstrappedNotInVestingHolders: Set<string> = new Set();

    for (const account of bootstrappedAccounts) {
        if (!vestingHolders.has(account)) {
            peopleNotInVestingHolders.add(account);
        }
    }

    const bootstrappedNotInVestingHoldersAllocations = await getAllAllocations(bootstrappedNotInVestingHolders, true);
    const totalBootstrappedNotInVestingHolders = bootstrappedNotInVestingHoldersAllocations.reduce(
        (previous, allocation) => assetToDecimal(allocation.tokens_allocated).add(previous),
        ZERO_DECIMAL
    );
    const uniqueBootstrappedNotInVestingHolders = bootstrappedNotInVestingHoldersAllocations.reduce(
        (previous, allocation) => {
            if (!previous.includes(allocation.account)) {
                return [...previous, allocation.account];
            } else {
                return previous;
            }
        },
        [] as string[]
    );

    console.log('Bootstrapped accounts not in vesting holders: ', Array.from(bootstrappedNotInVestingHolders).length);
    console.log('Total allocations: ', bootstrappedNotInVestingHoldersAllocations.length);
    console.log(
        `Total tokens: ${totalBootstrappedNotInVestingHolders.toFixed(4).padStart(14)} ${symbol} (${amountToSupplyPercentage(
            totalBootstrappedNotInVestingHolders
        ).padStart(10)})`
    );
    console.log('Unique bootstrapped accounts not in vesting holders: ', uniqueBootstrappedNotInVestingHolders.length);
}

export async function getAllPeople(print = false): Promise<GetPersonResponse[]> {
    const api = await getApi();

    const limit = 100;
    let lowerBound = Name.from('1');
    let peopleFound = 0;

    const people: GetPersonResponse[] = [];

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
