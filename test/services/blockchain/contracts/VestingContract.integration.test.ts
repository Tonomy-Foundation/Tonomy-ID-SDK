import { KeyManagerLevel, VestingContract, VestingSettings, VestingAllocation } from '../../../../src/sdk/index';
import { setTestSettings } from '../../../helpers/settings';
import { createRandomID } from '../../../helpers/user';
import { getAccountInfo } from '../../../../src/sdk/helpers/user';
import {
    Signer,
    createKeyManagerSigner,
    createSigner,
    getTonomyOperationsKey,
} from '../../../../src/sdk/services/blockchain';
import { sleep } from '../../../helpers/sleep';
import { addMicroseconds, addSeconds, sleepUntil } from '../../../../src/sdk/util';

setTestSettings();

const vestingContract = VestingContract.Instance;

const signer = createSigner(getTonomyOperationsKey());

describe('VestingContract class', () => {
    jest.setTimeout(60000);
    let saleStartDate: Date;
    let launchStartDate: Date;
    let saleStart: string;
    let launchStart: string;
    let accountName: string;
    let accountSigner: Signer;

    beforeEach(async () => {
        // Create a random user
        const { user } = await createRandomID();
        const userAccountName = await user.storage.accountName;
        const accountInfo = await getAccountInfo(userAccountName);

        accountName = accountInfo.account_name.toString();
        accountSigner = createKeyManagerSigner(user.keyManager, KeyManagerLevel.ACTIVE);

        // Set the sale and launch date
        saleStartDate = new Date();
        saleStart = saleStartDate.toISOString();
        launchStartDate = addSeconds(saleStartDate, 5);
        launchStart = launchStartDate.toISOString();

        await vestingContract.updatedate(saleStart, launchStart, signer);
    });

    test('updatedate(): Successfully set start and launch date', async () => {
        const settings = await vestingContract.getSettings();

        expect(settings.sales_start_date.split('.')[0]).toBe(saleStart.split('.')[0]);
        expect(settings.launch_date.split('.')[0]).toBe(launchStart.split('.')[0]);
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
        expect.assertions(13);

        const trx = await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

        console.log('cpu_usage_us', trx.processed.receipt.cpu_usage_us);

        expect(trx.processed.receipt.status).toBe('executed');
        expect(trx.processed.receipt.cpu_usage_us).toBeLessThan(500);
        const inlineTraces = trx.processed.action_traces[0].inline_traces;

        expect(inlineTraces.length).toBe(2);
        const transferAction = inlineTraces[1].act;

        expect(transferAction.account).toBe('eosio.token');
        expect(transferAction.data.from).toBe('coinsale.tmy');
        expect(transferAction.data.to).toBe('vesting.tmy');
        expect(transferAction.data.quantity).toBe('1.000000 LEOS');
        const allocations = await vestingContract.getAllocations(accountName);

        expect(allocations.length).toBe(1);
        expect(allocations[0].holder).toBe(accountName);
        expect(allocations[0].tokens_allocated).toBe('1.000000 LEOS');
        expect(allocations[0].tokens_claimed).toBe('0.000000 LEOS');
        expect(allocations[0].cliff_period_claimed).toBe(0);
        expect(allocations[0].vesting_category_type).toBe(999);
    });

    test('assignTokens(): Successfully assign tokens twice to a holder in different categories', async () => {
        expect.assertions(9);

        const trx1 = await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

        await sleep(500); // Needs to wait to be in a separate block, otherwise primary key is the same. See https://github.com/Tonomy-Foundation/Tonomy-Contracts/pull/111/commits/93525ff460299b3c97d623da78281524d164868d#diff-603eb802bda54a8100f95221bfed922b002a61284728341bf9221cede61c01c4R71
        const trx2 = await vestingContract.assignTokens('coinsale.tmy', accountName, '10.000000 LEOS', 1, signer);

        expect(trx1.processed.receipt.status).toBe('executed');
        expect(trx2.processed.receipt.status).toBe('executed');
        const allocations = await vestingContract.getAllocations(accountName);

        expect(allocations.length).toBe(2);
        expect(allocations[0].holder).toBe(accountName);
        expect(allocations[0].tokens_allocated).toBe('1.000000 LEOS');
        expect(allocations[0].vesting_category_type).toBe(999);
        expect(allocations[1].holder).toBe(accountName);
        expect(allocations[1].tokens_allocated).toBe('10.000000 LEOS');
        expect(allocations[1].vesting_category_type).toBe(1);
    });

    test('assignTokens(): Unsuccessful assignment due to invalid symbol', async () => {
        expect.assertions(1);

        try {
            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 EOS', 999, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain('Symbol does not match system resource currency');
        }
    });

    test('assignTokens(): Unsuccessful assignment due to invalid amount', async () => {
        expect.assertions(1);

        try {
            await vestingContract.assignTokens('coinsale.tmy', accountName, '-10.000000 LEOS', 999, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain('Amount must be greater than 0');
        }
    });

    test('assignTokens(): Unsuccessful assignment due to invalid precision', async () => {
        expect.assertions(1);

        try {
            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.0 LEOS', 999, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain('Symbol does not match system resource currency');
        }
    });

    test('assignTokens(): Unsuccessful assignment due to sales not started', async () => {
        expect.assertions(1);
        const salesDate = new Date(Date.now() + 10000).toISOString();
        const launchDate = new Date(Date.now() + 15000).toISOString();

        await vestingContract.updatedate(salesDate, launchDate, signer);

        try {
            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain('Sale has not yet started');
        }
    });

    test('assignTokens(): Unsuccessful assignment due to invalid category', async () => {
        expect.assertions(1);

        try {
            await vestingContract.assignTokens('coinsale.tmy', accountName, '10.000000 LEOS', 100, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain('Invalid vesting category');
        }
    });

    test(
        'assignTokens(): Unsuccessful assignment due to number of purchases',
        async () => {
            expect.assertions(1);

            for (let i = 0; i < VestingContract.MAX_ALLOCATIONS; i++) {
                await sleep(1000); // Needs to wait to be in a separate block, otherwise primary key is the same. See https://github.com/Tonomy-Foundation/Tonomy-Contracts/pull/111/commits/93525ff460299b3c97d623da78281524d164868d#diff-603eb802bda54a8100f95221bfed922b002a61284728341bf9221cede61c01c4R71
                await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);
            }

            try {
                await sleep(1000); // Needs to wait to be in a separate block, otherwise primary key is the same. See https://github.com/Tonomy-Foundation/Tonomy-Contracts/pull/111/commits/93525ff460299b3c97d623da78281524d164868d#diff-603eb802bda54a8100f95221bfed922b002a61284728341bf9221cede61c01c4R71
                await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);
            } catch (e) {
                expect(e.message).toContain('Cannot purchase tokens more than 20 times.');
            }
        },
        10000 + VestingContract.MAX_ALLOCATIONS * 1000
    );

    test('withdraw(): Successful withdrawal after cliff period', async () => {
        expect.assertions(10);
        const settings = await vestingContract.getSettings();

        await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

        let allocations = await vestingContract.getAllocations(accountName);
        const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

        await sleepUntil(addSeconds(vestingPeriod.cliffEnd, 1));
        const trx = await vestingContract.withdraw(accountName, accountSigner);

        expect(trx.processed.receipt.status).toBe('executed');
        expect(trx.processed.receipt.cpu_usage_us).toBeLessThan(500);
        expect(trx.processed.action_traces[0].inline_traces.length).toBe(1);
        const transferTrx = trx.processed.action_traces[0].inline_traces[0];

        expect(transferTrx.act.account).toBe('eosio.token');
        expect(transferTrx.act.name).toBe('transfer');
        expect(transferTrx.act.data.from).toBe('vesting.tmy');
        expect(transferTrx.act.data.to).toBe(accountName);
        const transferAmount = parseFloat(transferTrx.act.data.quantity.split(' ')[0]);

        expect(transferAmount).toBeLessThanOrEqual(1.0);
        expect(transferAmount).toBeGreaterThan(0.5);

        // const trxConsole = JSON.parse(trx.processed.action_traces[0].console);
        // console.log('trxConsole', trxConsole);
        // console.log('allocations', allocations);

        allocations = await vestingContract.getAllocations(accountName);
        const allocatedAmount = parseFloat(allocations[0].tokens_claimed.split(' ')[0]);

        expect(allocatedAmount).toBe(transferAmount);
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
    });

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
    });

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

            await vestingContract.assignTokens('coinsale.tmy', accountName, '100.000000 LEOS', 999, signer);

            await vestingContract.withdraw(accountName, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain('Vesting period after cliff has not started');
        }
    });
});
