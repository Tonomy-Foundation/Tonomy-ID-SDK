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
import { MILLISECONDS_IN_SECOND, SECONDS_IN_DAY } from '../../../../src/sdk/util';

const stakeContract = StakingContract.Instance;
const eosioTokenContract = EosioTokenContract.Instance;
const signer = createSigner(getTonomyOperationsKey());

describe('TonomyContract Staking Tests', () => {
    jest.setTimeout(60000);

    let accountName: string;
    let accountSigner: Signer;

    beforeEach(async () => {
        // Create a random user
        const { user } = await createRandomID();

        accountName = (await user.getAccountName()).toString()
        accountSigner = createKeyManagerSigner(user.keyManager, KeyManagerLevel.ACTIVE);

        // Issue tokens to the test account
        await eosioTokenContract.transfer("coinsale.tmy", accountName, '10.000000 LEOS', "testing LEOS", signer);
    });

    describe('staketokens()', () => {
        test('Stake tokens and verify staking allocation', async () => {
            // expect.assertions(7);

            // Stake tokens
            const stakeAmount = '1.000000 LEOS';
            const now = new Date();
            const trx = await stakeContract.stakeTokens(accountName, stakeAmount, accountSigner);
            
            expect(trx.processed.receipt.status).toBe('executed');

            // Retrieve staking allocation table
            const allocations = await stakeContract.getStakingAllocations(accountName);

            expect(allocations.length).toBe(1);

            const allocation = allocations[0];

            console.log(allocation);

            expect(allocation.staker).toBe(accountName);
            expect(allocation.staked).toBe(stakeAmount);
            console.log(now, allocation.stakedTime);
            expect(allocation.stakedTime.getTime()).toBeGreaterThan(now.getTime());
            expect(allocation.stakedTime.getTime()).toBeLessThanOrEqual(now.getTime() + MILLISECONDS_IN_SECOND);
            expect(allocation.unstakeableTime.getTime()).toBe(allocation.stakedTime.getTime() +
                (StakingContract.LOCKED_DAYS * MILLISECONDS_IN_SECOND * SECONDS_IN_DAY));
            expect(allocation.unstakeRequested).toBe(false);
        });
    });
});
