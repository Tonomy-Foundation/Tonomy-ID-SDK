import { VestngContract } from '../../../../src/sdk/index';
import { setTestSettings } from '../../../helpers/settings';
import { getSigner } from '../../../../src/cli/bootstrap/keys';

setTestSettings();

const vestngContract = VestngContract.Instance;

describe('VestngContract class', () => {
    const signer = getSigner();

    beforeEach(() => {
        jest.setTimeout(60000);
    });

    test('setStartDate(): Successfully set start date', async () => {
        expect.assertions(1);
        const salesDate = '2024-03-19T00:00:00';
        const launchDate = '2024-04-20T00:00:00';

        try {
            const trx = await vestngContract.updatedate(salesDate, launchDate, signer);

            console.log('trx', trx);
            expect(trx.processed.receipt.status).toBe('executed');
        } catch (e) {
            console.log(e.message, JSON.stringify(e, null, 2));
            throw e;
        }
    });

    test('assignTokens(): Successfully assign tokens to a holder', async () => {
        expect.assertions(1);

        try {
            const trx = await vestngContract.assignTokens('eosio.token', 'ecosystm.tmy', '10.000000 LEOS', 1, signer);

            expect(trx.processed.receipt.status).toBe('executed');
        } catch (e) {
            console.log(e.message, JSON.stringify(e, null, 2));
            throw e;
        }
    });

    test('assignTokens(): Unsuccessful assignment due to invalid symbol', async () => {
        expect.assertions(1);

        try {
            await vestngContract.assignTokens('eosio.token', 'ecosystm.tmy', '10.000000 EOS', 1, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain('invalid amount symbol');
        }
    });
    test('withdraw(): Successfully withdraw tokens with cliff period', async () => {
        // Set up the vesting allocation with a cliff period
        await contract.setAllocation(holderAccount, 1000, 60, 120);

        // Advance the time to after the cliff period
        await advanceTime(120);

        // Call the withdraw function
        const result = await contract.withdraw(holderAccount);

        // Check that the withdrawal was successful
        expect(result).toBe(true);
        // Check that the holder's balance has increased by the expected amount
        expect(await holderAccount.getBalance()).toBe(1000);
    });

    test('withdraw(): Unsuccessful withdrawal if start date not set', async () => {
        // Set up the vesting allocation without a start date
        await contract.setAllocation(holderAccount, 1000, null, 120);

        // Call the withdraw function
        const result = await contract.withdraw(holderAccount);

        // Check that the withdrawal was unsuccessful
        expect(result).toBe(false);
    });
    // Add more tests for other unsuccessful withdrawal scenarios
});
