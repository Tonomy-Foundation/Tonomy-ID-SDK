/* eslint-disable prettier/prettier */
import {
    amountToAsset,
    assetToAmount,
    createKeyManagerSigner,
    createSigner,
    EosioTokenContract,
    getTonomyOperationsKey,
    Signer,
    StakingContract,
    StakingSettings,
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
    let stakeSettings: StakingSettings;

    beforeEach(async () => {
        // Create a random user
        const { user } = await createRandomID();

        accountName = (await user.getAccountName()).toString()
        accountSigner = createKeyManagerSigner(user.keyManager, KeyManagerLevel.ACTIVE);

        // Issue tokens to the test account
        await eosioTokenContract.transfer("coinsale.tmy", accountName, '10.000000 LEOS', "testing LEOS", signer);
        stakeSettings = await stakeContract.getSettings();
    });

    describe('staketokens()', () => {
        test('Stake tokens and verify staking allocation', async () => {
            expect.assertions(11);

            // Stake tokens
            const stakeAmount = '1.000000 LEOS';
            const now = new Date();
            const trx = await stakeContract.stakeTokens(accountName, stakeAmount, accountSigner);
            
            expect(trx.processed.receipt.status).toBe('executed');

            // Retrieve staking allocation table
            const allocations = await stakeContract.getAllocations(accountName, stakeSettings);

            expect(allocations.length).toBe(1);

            const allocation = allocations[0];

            expect(allocation.staker).toBe(accountName);
            expect(allocation.initialStake).toBe(stakeAmount);
            expect(allocation.staked).toBe(stakeAmount);
            expect(allocation.yieldSoFar).toBe(amountToAsset(0, "LEOS"));
            expect(allocation.stakedTime.getTime()).toBeGreaterThan(now.getTime());
            expect(allocation.stakedTime.getTime()).toBeLessThanOrEqual(now.getTime() + MILLISECONDS_IN_SECOND);
            expect(allocation.unstakeableTime.getTime()).toBe(allocation.stakedTime.getTime() +
                (StakingContract.getLockedDays() * MILLISECONDS_IN_SECOND * SECONDS_IN_DAY));
            expect(allocation.unstakeRequested).toBe(false);
            expect(allocation.monthlyYield).toBe(amountToAsset(assetToAmount(allocation.staked) * (Math.pow(1 + stakeSettings.apy, 1 / 12) - 1), 'LEOS'));
        });
    });
});
