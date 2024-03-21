import { VestngContract } from '../../../../src/sdk/index';
import { setTestSettings } from '../../../helpers/settings';
import { getSigner } from '../../../../src/cli/bootstrap/keys';
import { getAccountInfo } from '../../../../src/sdk/helpers/user';
import { Name } from '@wharfkit/antelope';

setTestSettings();

const vestngContract = VestngContract.Instance;

describe('VestngContract class', () => {
    const signer = getSigner();

    beforeEach(() => {
        jest.setTimeout(60000);
    });

    test('setStartDate(): Successfully set start date', async () => {
        expect.assertions(1);
        const salesDate = '2023-03-20T00:00:00';
        const launchDate = '2022-01-25T00:00:00';

        try {
            const trx = await vestngContract.updatedate(salesDate, launchDate, signer);

            expect(trx.processed.receipt.status).toBe('executed');
        } catch (e) {
            console.log(e.message, JSON.stringify(e, null, 2));
            throw e;
        }
    });

    test('assignTokens(): Successfully assign tokens to a holder', async () => {
        expect.assertions(1);

        try {
            const trx = await vestngContract.assignTokens('eosio.token', 'ecosystm.tmy', '5000.000000 LEOS', 1, signer);

            expect(trx.processed.receipt.status).toBe('executed');
        } catch (e) {
            console.log(e.message, JSON.stringify(e, null, 2));
            throw e;
        }
    });

    test('assignTokens(): Unsuccessful assignment due to invalid symbol', async () => {
        expect.assertions(1);

        try {
            await vestngContract.assignTokens('eosio.token', 'ops.tmy', '10.000000 EOS', 1, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain(' Symbol does not match system resource currency');
        }
    });
    test('assignTokens(): Unsuccessful assignment due to invalid amount', async () => {
        expect.assertions(1);

        try {
            await vestngContract.assignTokens('eosio.token', 'ops.tmy', '-10.000000 LEOS', 1, signer);
        } catch (e) {
            expect(e.error.details[0].message).toContain('Amount must be greater than 0');
        }
    });
    test('withdraw(): Successful withdrawal with cliff period', async () => {
        expect.assertions(1);
        const holder = 'ecosystm.tmy';

        try {
            const account2 = await getAccountInfo(Name.from('vestng.token'));

            console.log('Account', JSON.stringify(account2.getPermission('active')));
            const trx = await vestngContract.withdraw(holder, signer);

            expect(trx.processed.receipt.status).toBe('executed');
        } catch (e) {
            console.log(e.message, JSON.stringify(e, null, 2));
            throw e;
        }
    });

    test('withdraw(): Successful withdrawal with 2 different allocations of same category', async () => {
        expect.assertions(1);
        const holder = 'team.tmy';

        try {
            await vestngContract.assignTokens('eosio.token', 'team.tmy', '3000.000000 LEOS', 1, signer);

            await vestngContract.assignTokens('eosio.token', 'coinsale.tmy', '4000.000000 LEOS', 1, signer);

            const trx1 = await vestngContract.withdraw(holder, signer);

            expect(trx1.processed.receipt.status).toBe('executed');
        } catch (e) {
            console.log(e.message, JSON.stringify(e, null, 2));
            throw e;
        }
    }, 10000);

    test('withdraw():  successful withdrawal with 2 different allocations of different category', async () => {
        expect.assertions(111);
        const holder = 'ops.tmy';

        try {
            await vestngContract.assignTokens('eosio.token', 'ops.tmy', '1000.000000 LEOS', 1, signer);
            await vestngContract.assignTokens('eosio.token', 'ecosystm.tmy', '1000.000000 LEOS', 2, signer);

            const trx1 = await vestngContract.withdraw(holder, signer);

            expect(trx1.processed.receipt.status).toBe('executed');
        } catch (e) {
            console.log(e.message, JSON.stringify(e, null, 2));
            throw e;
        }
    }, 10000);
});
