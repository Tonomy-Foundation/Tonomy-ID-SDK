import { VestngContract } from '../../../../src/sdk/index';
import { setTestSettings } from '../../../helpers/settings';
import { createSigner, getTonomyOperationsKey } from '../../../../src/sdk/services/blockchain';
import { getSigner } from '../../../../src/cli/bootstrap/keys';

setTestSettings();

const vestngContract = VestngContract.Instance;

describe('VestngContract class', () => {
    const signer = createSigner(getTonomyOperationsKey());

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

    // test('assignTokens(): Successfully assign tokens to a holder', async () => {
    //     expect.assertions(1);

    //     try {
    //         const trx = await vestngContract.assignTokens('eosio.token', 'ecosystm.tmy', '10.000000 LEOS', 1, signer);

    //         expect(trx.processed.receipt.status).toBe('executed');
    //     } catch (e) {
    //         console.log(e.message, JSON.stringify(e, null, 2));
    //         throw e;
    //     }
    // });

    // test('assignTokens(): Unsuccessful assignment due to invalid symbol', async () => {
    //     expect.assertions(1);

    //     try {
    //         await vestngContract.assignTokens('eosio.token', 'ecosystm.tmy', '10.000000 EOS', 1, signer);
    //     } catch (e) {
    //         expect(e.error.details[0].message).toContain('invalid amount symbol');
    //     }
    // });
});
