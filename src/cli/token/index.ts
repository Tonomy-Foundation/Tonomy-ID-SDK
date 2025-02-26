import { Checksum256, Name, PrivateKey } from '@wharfkit/antelope';
import { AccountType, TonomyUsername, EosioTokenContract } from '../../sdk';
import { createSigner, getAccount, getAccountNameFromUsername } from '../../sdk/services/blockchain';
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
const LEOS_SUPPLY = new Decimal(EosioTokenContract.TOTAL_SUPPLY);

interface AppTokenData extends AccountTokenData {
    ramQuota: number;
    ramUsage: number;
}

export async function audit() {
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

    bootstrappedData.forEach((data, key) => {
        const fraction = data.tokens.div(LEOS_SUPPLY).mul(100).toFixed(8) + '%';

        console.log(`${key.padEnd(14)} ${fraction.padStart(12)} (${data.tokens.toFixed(4).padStart(15)} LEOS)`);
    });
    return;

    // check how much total vested LEOS there is in the different categories and print. this shows us sales
    const appAccounts = new Map<string, AppTokenData>();

    const apps = await getAllApps();

    await Promise.all(
        apps.map(async (app) => {
            const balance = new Decimal(await tokenContract.getBalance(app.account_name));
            const account = await getAccount(app.account_name);

            appAccounts.set(app.account_name.toString(), {
                description: app.description,
                tokens: balance,
                vested: ZERO_DECIMAL,
                ramQuota: account.ram_quota.toNumber(),
                ramUsage: account.ram_usage.toNumber(),
            });
        })
    );

    console.log('App accounts: ', appAccounts);

    const peopleAccounts = new Map<string, AccountTokenData>();
    const people = await getAllPeople();

    await Promise.all(
        people.map(async (person) => {
            const balance = new Decimal(await tokenContract.getBalance(person.account_name));

            peopleAccounts.set(person.account_name, {
                description: 'Person',
                tokens: balance,
                vested: ZERO_DECIMAL,
            });
        })
    );

    console.log('People', peopleAccounts);

    // get all bootstrap account, apps, people, advisors, block producers and team
    // check allocations on all bootstrapped accounts
    // check all allocations on all apps
    // check all allocations on all people
    // check all vested allocations in vesting contract
    // check all staking allocations in staking contract
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

async function getAllPeople() {
    const api = await getApi();

    const limit = 100;
    let lowerBound = Name.from('1');
    let peopleFound = 0;

    const people: any[] = [];

    do {
        console.log(`get_table_rows: people, ${limit}, ${lowerBound.toString()}`);
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
