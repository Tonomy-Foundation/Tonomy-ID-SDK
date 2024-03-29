import { VestingContract } from '../../../../src/sdk/index';
import { setTestSettings } from '../../../helpers/settings';
import { createRandomID } from '../../../helpers/user';
import { getAccountInfo } from '../../../../src/sdk/helpers/user';
import { createSigner, getTonomyOperationsKey } from '../../../../src/sdk/services/blockchain';

setTestSettings();

const vestingContract = VestingContract.Instance;

const signer = createSigner(getTonomyOperationsKey());

describe('VestingContract class', () => {
    jest.setTimeout(60000);
    let now: string;
    let nowPlus10s: string;
    let accountName: string;

    beforeEach(async () => {
        now = new Date().toISOString();
        nowPlus10s = new Date(Date.now() + 5000).toISOString();

        await vestingContract.updatedate(now, nowPlus10s, signer);

        const { user } = await createRandomID();
        const userAccountName = await user.storage.accountName;
        const accountInfo = await getAccountInfo(userAccountName);

        accountName = accountInfo.account_name.toString();
        console.log('accountName', accountName);
    });

    test('updatedate(): Successfully set start and launch date', async () => {
        const settings = await vestingContract.getSettings();

        expect(settings.sales_start_date).toBe(now.split('.')[0]);
        expect(settings.launch_date).toBe(nowPlus10s.split('.')[0]);
    });

    test('updatedate(): Unsuccessful if  date not format incorrect', async () => {
        const salesDate = 'undefined';
        const launchDate = 'undefined';

        try {
            await vestingContract.updatedate(salesDate, launchDate, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain('date parsing failed');
        }
    });

    test('assignTokens(): Successfully assign tokens to a holder', async () => {
        expect.assertions(7);

        const trx = await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

        expect(trx.processed.receipt.status).toBe('executed');
        const allocations = await vestingContract.getAllocations(accountName);

        expect(allocations.length).toBe(1);
        expect(allocations[0].holder).toBe(accountName);
        expect(allocations[0].total_allocated).toBe('1.000000 LEOS');
        expect(allocations[0].tokens_claimed).toBe('0.000000 LEOS');
        expect(allocations[0].cliff_period_claimed).toBe(0);
        expect(allocations[0].vesting_category_type).toBe(999);
    });

    test('assignTokens(): Unsuccessful assignment due to invalid symbol', async () => {
        expect.assertions(1);

        try {
            await vestingContract.assignTokens('coinsale.tmy', accountName, '10.000000 EOS', 1, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain(' Symbol does not match system resource currency');
        }
    });

    test('assignTokens(): Unsuccessful assignment due to invalid amount', async () => {
        expect.assertions(1);

        try {
            const { user } = await createRandomID();
            const userAccountName = await user.storage.accountName;
            const accountInfo = await getAccountInfo(userAccountName);
            const accountName = accountInfo.account_name.toString();

            await vestingContract.assignTokens('coinsale.tmy', accountName, '-10.000000 LEOS', 1, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain('Amount must be greater than 0');
        }
    });

    test('assignTokens(): Unsuccessful assignment due to sales not started', async () => {
        expect.assertions(1);
        const salesDate = new Date(Date.now() + 10000).toISOString();
        const launchDate = new Date(Date.now() + 15000).toISOString();

        try {
            const { user } = await createRandomID();
            const userAccountName = await user.storage.accountName;
            const accountInfo = await getAccountInfo(userAccountName);
            const accountName = accountInfo.account_name.toString();

            await vestingContract.updatedate(salesDate, launchDate, signer);
            await vestingContract.assignTokens('coinsale.tmy', accountName, '10.000000 LEOS', 1, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain('Sale has not yet started');
        }
    });

    test('assignTokens(): Unsuccessfull assignment due to invalid category', async () => {
        expect.assertions(1);

        try {
            const { user } = await createRandomID();
            const userAccountName = await user.storage.accountName;
            const accountInfo = await getAccountInfo(userAccountName);
            const accountName = accountInfo.account_name.toString();

            await vestingContract.assignTokens('coinsale.tmy', accountName, '10.000000 LEOS', 0, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain('Invalid vesting category');
        }
    });

    test('assignTokens(): Unsuccessful assignment due to number of purchases', async () => {
        expect.assertions(1);

        try {
            const { user } = await createRandomID();
            const userAccountName = await user.storage.accountName;
            const accountInfo = await getAccountInfo(userAccountName);
            const accountName = accountInfo.account_name.toString();

            const promises = [];

            for (let i = 0; i < 21; i++) {
                promises.push(
                    new Promise((resolve, reject) => {
                        setTimeout(() => {
                            vestingContract
                                .assignTokens('coinsale.tmy', accountName, '10.000000 LEOS', 1, signer)
                                .then(resolve)
                                .catch(reject);
                        }, i * 2000); // Delay each transaction by 2 seconds
                    })
                );
            }

            await Promise.all(promises);
        } catch (e) {
            expect(e.message).toContain('Cannot purchase tokens more than 20 times.');
        }
    }, 60000);

    test('withdraw(): Unsuccessful withdrawal vesting period after cliff not started', async () => {
        expect.assertions(1);
        const salesDate = '2023-03-27T00:00:00';
        const launchDate = '2023-06-25T00:00:00';

        try {
            const { user } = await createRandomID();
            const userAccountName = await user.storage.accountName;
            const accountInfo = await getAccountInfo(userAccountName);
            const accountName = accountInfo.account_name.toString();

            await vestingContract.updatedate(salesDate, launchDate, signer);

            await vestingContract.assignTokens('coinsale.tmy', accountName, '100.000000 LEOS', 1, signer);

            await vestingContract.withdraw(accountName, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain('Vesting period after cliff has not started');
        }
    });

    test('withdraw(): Successful withdrawal with cliff period', async () => {
        expect.assertions(1);
        const salesDate = '2023-03-20T00:00:00';
        const launchDate = '2022-01-25T00:00:00';

        const { user } = await createRandomID();
        const userAccountName = await user.storage.accountName;
        const accountInfo = await getAccountInfo(userAccountName);
        const accountName = accountInfo.account_name.toString();

        await vestingContract.updatedate(salesDate, launchDate, signer);
        await vestingContract.assignTokens('coinsale.tmy', accountName, '100.000000 LEOS', 1, signer);

        const trx = await vestingContract.withdraw(accountName, signer);

        expect(trx.processed.receipt.status).toBe('executed');
    });

    test('withdraw(): Successful withdrawal with 2 different allocations of same category', async () => {
        expect.assertions(2);

        const category = 1;

        for (let i = 0; i < 2; i++) {
            const { user } = await createRandomID();
            const userAccountName = await user.storage.accountName;
            const accountInfo = await getAccountInfo(userAccountName);
            const accountName = accountInfo.account_name.toString();

            await vestingContract.assignTokens('eosio.token', accountName, '500.000000 LEOS', category, signer);
            const trx = await vestingContract.withdraw(accountName, signer);

            expect(trx.processed.receipt.status).toBe('executed');
        }
    }, 10000);

    test('withdraw(): Successful withdrawal with 2 different allocations of different category', async () => {
        expect.assertions(2);

        const category = [1, 2];

        for (let i = 0; i < 2; i++) {
            const { user } = await createRandomID();
            const userAccountName = await user.storage.accountName;
            const accountInfo = await getAccountInfo(userAccountName);
            const accountName = accountInfo.account_name.toString();

            await vestingContract.assignTokens('eosio.token', accountName, '500.000000 LEOS', category[i], signer);
            const trx = await vestingContract.withdraw(accountName, signer);

            expect(trx.processed.receipt.status).toBe('executed');
        }
    }, 10000);
});
