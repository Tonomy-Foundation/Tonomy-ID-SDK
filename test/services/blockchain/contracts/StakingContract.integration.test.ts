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
import { PrivateKey } from '@wharfkit/antelope';
import Debug from 'debug';
import { sleep } from '../../../helpers/sleep';

const debug = Debug('tonomy-sdk-tests:services:staking-contract');

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

    describe('setsettings()', () => {
        test('Successfully update settings with valid asset', async () => {
            const newYearlyStakePool = "100.000000 LEOS";
            const trx = await stakeContract.setSettings(newYearlyStakePool, signer);

            expect(trx.processed.receipt.status).toBe('executed');

            const updatedSettings = await stakeContract.getSettings();

            expect(updatedSettings.yearlyStakePool).toBe(newYearlyStakePool);

            // Revert settings to previous
            await stakeContract.setSettings(amountToAsset(StakingContract.yearlyStakePool, 'LEOS'), signer)
        });

        test('Fails update with wrong asset symbol', async () => {
            expect.assertions(1);

            try {
                await stakeContract.setSettings("100.000000 EOS", signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Symbol does not match system resource currency");
            }
        });

        test('Fails update with zero amount', async () => {
            expect.assertions(1);

            try {
                await stakeContract.setSettings("0.000000 LEOS", signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Amount must be greater than 0");
            }
        });

        test('Fails update with unauthorized signer', async () => {
            expect.assertions(1);
            const wrongSigner = createSigner(PrivateKey.generate("K1"));

            try {
                await stakeContract.setSettings("100.000000 LEOS", wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority");
            }
        });
    });

    describe('addyield()', () => {
        test('Successfully add yield tokens', async () => {
            // Get initial yield pool from settings
            const initialSettings = await stakeContract.getSettings();
            const initialYield = assetToAmount(initialSettings.currentYieldPool);

            const additionalYield = "1.000000 LEOS";
            const trx = await stakeContract.addYield("infra.tmy", additionalYield, signer);

            expect(trx.processed.receipt.status).toBe('executed');

            const updatedSettings = await stakeContract.getSettings();
            const updatedYield = assetToAmount(updatedSettings.currentYieldPool);

            // Verify that the current yield pool has increased by the yield amount
            expect(updatedYield - initialYield).toBeCloseTo(assetToAmount(additionalYield));
        });

        test('Fails add yield if below minimum amount', async () => {
            expect.assertions(1);

            try {
                await stakeContract.addYield("infra.tmy", "0.500000 LEOS", signer);
            } catch (e) {
                debug('Fails add yield if below minimum amount', e)
                expect(e.error.details[0].message).toContain("Amount must be greater than or equal to 1.000000 LEOS");
            }
        });

        test('Fails add yield with wrong asset symbol', async () => {
            expect.assertions(1);

            try {
                await stakeContract.addYield("infra.tmy", "1.000000 EOS", signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Symbol does not match system resource currency");
            }
        });

        test('Fails add yield with zero amount', async () => {
            expect.assertions(1);

            try {
                await stakeContract.addYield("infra.tmy", "0.000000 LEOS", signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Amount must be greater than 0");
            }
        });

        test('Fails add yield with unauthorized signer', async () => {
            expect.assertions(1);
            const wrongSigner = createSigner(PrivateKey.generate("K1"));

            try {
                await stakeContract.addYield("infra.tmy", "1.000000 LEOS", wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority");
            }
        });
    });

    describe('staketokens()', () => {
        test('Stake tokens and verify staking allocation', async () => {
            expect.assertions(11);

            // Stake tokens
            const stakeAmount = '1.000000 LEOS'; // meets minimum requirement
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
            expect(allocation.unstakeableTime.getTime()).toBe(
                allocation.stakedTime.getTime() + (StakingContract.getLockedDays() * MILLISECONDS_IN_SECOND * SECONDS_IN_DAY)
            );
            expect(allocation.unstakeRequested).toBe(false);
            expect(allocation.monthlyYield).toBe(
                amountToAsset(
                    assetToAmount(allocation.staked) * (Math.pow(1 + stakeSettings.apy, 1 / 12) - 1),
                    'LEOS'
                )
            );
        });

        test('Fails staking tokens with invalid staker account', async () => {
            expect.assertions(1);
            // Use a staker account name outside the valid range.
            const invalidStaker = "ops.tmy";

            try {
                await stakeContract.stakeTokens(invalidStaker, "1.000000 LEOS", signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Invalid staker account");
            }
        });

        test('Fails staking tokens with amount below minimum', async () => {
            expect.assertions(1);

            // Provide an amount below the minimum (assumed to be 1 LEOS)
            try {
                await stakeContract.stakeTokens(accountName, "0.500000 LEOS", accountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Amount must be greater than or equal to 1.000000 LEOS");
            }
        });

        test('Fails staking tokens when too many stakes are received', async () => {
            expect.assertions(2 + StakingContract.getMaxAllocations());

            for (let i = 0; i < StakingContract.getMaxAllocations(); i++) {
                debug(`Iteration ${i} / ${StakingContract.getMaxAllocations()}`);
                const trx = await stakeContract.stakeTokens(accountName, "1.000000 LEOS", accountSigner);

                await sleep(1000); // Wait to ensure don't get duplicate transaction error
                expect(trx.processed.receipt.status).toBe('executed');
            }

            const allocations = await stakeContract.getAllocations(accountName, stakeSettings);
            
            expect(allocations.length).toBe(StakingContract.getMaxAllocations());
            
            try {
                debug('Iteration: final')
                await stakeContract.stakeTokens(accountName, "1.000000 LEOS", accountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Too many stakes received on this account");
            }
        }, 1.5 * StakingContract.getMaxAllocations() * 1000);
    });
});
