/* eslint-disable prettier/prettier */
import {
    createKeyManagerSigner,
    createSigner,
    EosioTokenContract,
    getTonomyOperationsKey,
    Signer,
    StakingContract,
} from '../../../../src/sdk/services/blockchain';
import { KeyManagerLevel } from '../../../../src/sdk/index';
import { jest } from '@jest/globals';
import { createRandomID } from '../../../helpers/user';

const stakeContract = StakingContract.Instance;
const eosioTokenContract = EosioTokenContract.Instance;
const signer = createSigner(getTonomyOperationsKey());

describe('TonomyContract Staking Tests', () => {
    jest.setTimeout(60000);

    let accountName: string;
    let accountSigner: Signer;

    beforeEach(async () => {
        // Create a random account for testing
        // Create a random user
        const { user } = await createRandomID();

        accountName = (await user.getAccountName()).toString()
        accountSigner = createKeyManagerSigner(user.keyManager, KeyManagerLevel.ACTIVE);

        // Issue tokens to the test account
        await eosioTokenContract.transfer("coinsale.tmy", accountName, '10.000000 LEOS', "testing LEOS", signer);
    });

    describe('staketokens()', () => {
        test('Stake tokens and verify staking allocation', async () => {
            // expect.assertions(5);

            // Stake tokens
            const stakeAmount = '1.000000 LEOS';
            const trx = await stakeContract.stakeTokens(accountName, stakeAmount, accountSigner);

            expect(trx.processed.receipt.status).toBe('executed');

            // Retrieve staking allocation table
            const allocations = await stakeContract.getAllocations(accountName);

            expect(allocations.length).toBe(1);

            const allocation = allocations[0];

            expect(allocation.account_name).toBe(accountName);
            expect(allocation.tokens_staked).toBe(stakeAmount);
            // expect(allocation.stake_time).toBe(stakeAmount);
            // expect(allocation.unstake_time).toBe(stakeAmount);
            // expect(allocation.unstake_requested).toBe(stakeAmount);
        });
    });
});
