/* eslint-disable prettier/prettier */
import {
    amountToAsset,
    assetToAmount,
    createKeyManagerSigner,
    createSigner,
    EosioTokenContract,
    getTonomyOperationsKey,
    Signer,
    StakingAllocationDetails,
    StakingContract,
    StakingSettings,
} from '../../../../src/sdk/services/blockchain';
import { KeyManagerLevel } from '../../../../src/sdk/index';
import { jest } from '@jest/globals';
import { createRandomID } from '../../../helpers/user';
import { addSeconds, MILLISECONDS_IN_SECOND, SECONDS_IN_DAY, sleepUntil } from '../../../../src/sdk/util';
import { PrivateKey } from '@wharfkit/antelope';
import Debug from 'debug';
import { sleep } from '../../../helpers/sleep';

const debug = Debug('tonomy-sdk-tests:services:staking-contract');

const stakeContract = StakingContract.Instance;
const eosioTokenContract = EosioTokenContract.Instance;
const signer = createSigner(getTonomyOperationsKey());

async function resetContract() {
    await stakeContract.resetAll(signer);
    await stakeContract.setSettings(amountToAsset(StakingContract.yearlyStakePool, 'LEOS'), signer);
    await stakeContract.addYield('infra.tmy', amountToAsset(StakingContract.yearlyStakePool / 2, 'LEOS'), signer); // 6 months budget in the account
}

describe('TonomyContract Staking Tests', () => {
    jest.setTimeout(60000);

    let accountName: string;
    let accountSigner: Signer;
    let stakeSettings: StakingSettings;
    const stakeAmount = "1.000000 LEOS";

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

            const additionalYield = "10.000000 LEOS";
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
                await stakeContract.addYield("infra.tmy", stakeAmount, wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority");
            }
        });
    });

    describe('staketokens()', () => {
        test('Stake tokens and verify staking allocation and table updates', async () => {
            expect.assertions(16);
    
            const now = new Date();
            const trx = await stakeContract.stakeTokens(accountName, stakeAmount, accountSigner);

            expect(trx.processed.receipt.status).toBe('executed');
    
            // Retrieve staking allocation table and verify allocation details
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
                allocation.stakedTime.getTime() +
                (StakingContract.getLockedDays() * MILLISECONDS_IN_SECOND * SECONDS_IN_DAY)
            );
            expect(allocation.unstakeRequested).toBe(false);
            expect(allocation.monthlyYield).toBe(
                amountToAsset(
                    assetToAmount(allocation.staked) * (Math.pow(1 + stakeSettings.apy, 1 / 12) - 1),
                    'LEOS'
                )
            );
    
            // Verify that the settings table has been updated
            const updatedSettings = await stakeContract.getSettings();

            // total_staked should have increased by stakeAmount.
            expect(assetToAmount(updatedSettings.totalStaked)-assetToAmount(stakeSettings.totalStaked)).toBeCloseTo(assetToAmount(stakeAmount));
    
            // Verify that the staking account table has been updated.
            const accountData = await stakeContract.getAccount(accountName);

            expect(accountData.staker).toBe(accountName);
            expect(accountData.lastPayout.toString()).toBe(allocation.stakedTime.toString())
            expect(accountData.totalYield).toBe(amountToAsset(0, "LEOS"));
            expect(accountData.version).toBe(1);
        });
    
        test('Fails staking tokens with invalid staker account (below allowed range)', async () => {
            expect.assertions(1);
            const invalidAccount = "ops.tmy"; // below p111111111111

            try {
                await stakeContract.stakeTokens(invalidAccount, stakeAmount, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Invalid staker account");
            }
        });
    
        test('Fails staking tokens with staker above allowed range', async () => {
            expect.assertions(1);
            const invalidStaker = "tonomy"; // above pzzzzzzzzzz

            try {
                await stakeContract.stakeTokens(invalidStaker, stakeAmount, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Invalid staker account");
            }
        });
    
        test('Fails staking tokens with incorrect asset precision', async () => {
            expect.assertions(1);

            try {
                await stakeContract.stakeTokens(accountName, "1.0 LEOS", accountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Symbol does not match system resource");
            }
        });
    
        test('Fails staking tokens with incorrect asset symbol', async () => {
            expect.assertions(1);

            try {
                await stakeContract.stakeTokens(accountName, "1.000000 EOS", accountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Symbol does not match system resource currency");
            }
        });
    
        test('Stake tokens twice and verify both allocations are present', async () => {
            expect.assertions(3);
            // Stake twice
            await stakeContract.stakeTokens(accountName, "1.000000 LEOS", accountSigner);
            await stakeContract.stakeTokens(accountName, "2.000000 LEOS", accountSigner);
    
            const allocations = await stakeContract.getAllocations(accountName, stakeSettings);

            expect(allocations.length).toBe(2);
            expect(allocations[0].staked).toBe("1.000000 LEOS");
            expect(allocations[1].staked).toBe("2.000000 LEOS");
        });
    
        test('getAccountAndAllocations returns correct aggregated values', async () => {
            expect.assertions(10);
            await stakeContract.stakeTokens(accountName, "1.000000 LEOS", accountSigner);
            await stakeContract.stakeTokens(accountName, "2.000000 LEOS", accountSigner);
    
            // Retrieve full account and allocations data
            const fullData = await stakeContract.getAccountAndAllocations(accountName);

            // totalStaked should equal sum of staked amounts from active allocations (1 + 2 = 3 LEOS)
            expect(fullData.totalStaked).toBeCloseTo(3);
            // estimatedMonthlyYield should equal the sum of monthly yields for each allocation.
            const expectedYield1 = assetToAmount("1.000000 LEOS") * (Math.pow(1 + stakeSettings.apy, 1 / 12) - 1);
            const expectedYield2 = assetToAmount("2.000000 LEOS") * (Math.pow(1 + stakeSettings.apy, 1 / 12) - 1);

            expect(fullData.estimatedMonthlyYield).toBeCloseTo(expectedYield1 + expectedYield2);
            expect(fullData.allocations.length).toBe(2);
            expect(fullData.lastPayout.getTime()).toBeGreaterThanOrEqual(fullData.allocations[0].stakedTime.getTime());
            expect(fullData.lastPayout.getTime()).toBeLessThanOrEqual(fullData.allocations[0].stakedTime.getTime() + MILLISECONDS_IN_SECOND);
            expect(fullData.staker).toBe(accountName);
            expect(fullData.totalYield).toBe(amountToAsset(0, "LEOS"));
            expect(fullData.version).toBe(1);
            expect(fullData.totalUnlockable).toBe(0);
            expect(fullData.totalUnlocking).toBe(0);
        });
    
        test('Fails staking tokens if not signed by the staker account', async () => {
            expect.assertions(1);
            const wrongSigner = createSigner(PrivateKey.generate("K1"));

            try {
                await stakeContract.stakeTokens(accountName, stakeAmount, wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority");
            }
        });

        test('APY decreases below 2.0 if yield pool is low relative to staked tokens', async () => {
            await resetContract();
            expect.assertions(1);
            // Set a low yearly stake pool (e.g. 50 LEOS) so that APY = 50/total_staked.
            await stakeContract.setSettings("50.000000 LEOS", signer);
          
            // Staker1 stakes 1000 LEOS.
            await eosioTokenContract.transfer("coinsale.tmy", accountName, '1000.000000 LEOS', "testing LEOS", signer);
            await stakeContract.stakeTokens(accountName, "1000.000000 LEOS", accountSigner);
          
            // Create a second staker.
            const { user: user2 } = await createRandomID();
            const accountName2 = (await user2.getAccountName()).toString();
            const accountSigner2 = createKeyManagerSigner(user2.keyManager, KeyManagerLevel.ACTIVE);

            await eosioTokenContract.transfer("coinsale.tmy", accountName2, "1000.000000 LEOS", "testing", signer);
            await stakeContract.stakeTokens(accountName2, "1000.000000 LEOS", accountSigner2);
          
            // Total staked = 2000 LEOS, so APY = 50/2000 = 0.025.
            const settingsAfter = await stakeContract.getSettings();

            expect(settingsAfter.apy).toBeCloseTo(0.025, 6);
        });

        test('APY decreases when additional stake is added, and increases when stake is removed', async () => {
            await resetContract();

            expect.assertions(3);
            // Set a fixed yearly stake pool.
            await eosioTokenContract.transfer("coinsale.tmy", accountName, '1001.000000 LEOS', "testing LEOS", signer);
            await stakeContract.setSettings("1000.000000 LEOS", signer);
          
            // Staker1 stakes 1000 LEOS.
            await stakeContract.stakeTokens(accountName, "1000.000000 LEOS", accountSigner);
            const settings1 = await stakeContract.getSettings();
            const apy1 = settings1.apy; // Expected: 1000/1000 = 1.0.

            expect(apy1).toBeCloseTo(1.0, 6);
          
            // Create a second staker.
            const { user: user2 } = await createRandomID();
            const accountName2 = (await user2.getAccountName()).toString();
            const accountSigner2 = createKeyManagerSigner(user2.keyManager, KeyManagerLevel.ACTIVE);

            await eosioTokenContract.transfer("coinsale.tmy", accountName2, "1000.000000 LEOS", "testing", signer);
            await stakeContract.stakeTokens(accountName2, "1000.000000 LEOS", accountSigner2);
            const settings2 = await stakeContract.getSettings();
            const apy2 = settings2.apy; // Expected: 1000/2000 = 0.5.

            expect(apy2).toBeCloseTo(0.5, 6);
          
            // Have staker1 request unstake.
            const allocations1 = await stakeContract.getAllocations(accountName, settings2);
            const allocationId1 = allocations1[0].id;

            // Wait until lockup period expires.
            await sleepUntil(addSeconds(allocations1[0].unstakeableTime, 1));
            await stakeContract.requestUnstake(accountName, allocationId1, accountSigner);
            const settings3 = await stakeContract.getSettings();
            const apy3 = settings3.apy; // Expected: total staked decreases back to 1000, so APY = 1.0.

            expect(apy3).toBeCloseTo(1.0, 6);
        });
          
          
    });
    
    describe('requnstake()', () => {
        // Tests that depend on the user having already staked tokens
        describe('when staketokens() has already been called by the user', () => {
            let allocation: StakingAllocationDetails;
            let allocationId: number;
      
            beforeEach(async () => {
                // Stake tokens and retrieve the allocation id
                await stakeContract.stakeTokens(accountName, stakeAmount, accountSigner);
                const allocations = await stakeContract.getAllocations(accountName, stakeSettings);

                allocation = allocations[0];
                allocationId = allocation.id;
                stakeSettings = await stakeContract.getSettings();
            });
      
            test('Successfully request unstake after lockup period and update tables', async () => {
                expect.assertions(7);

                await sleepUntil(addSeconds(allocation.unstakeableTime, 1));
                const now = new Date();

                const unstakeTrx = await stakeContract.requestUnstake(accountName, allocationId, accountSigner);

                expect(unstakeTrx.processed.receipt.status).toBe('executed');

                // Verify the allocation is updated
                const allocations = await stakeContract.getAllocations(accountName, stakeSettings);
                const allocationAlterUnstake = allocations.find(a => a.id === allocationId);

                if(!allocationAlterUnstake) throw new Error("Allocation not found");
                expect(allocationAlterUnstake.unstakeRequested).toBe(true);
                expect(allocationAlterUnstake.unstakeTime.getTime()).toBeGreaterThan(now.getTime());
                expect(allocationAlterUnstake.unstakeTime.getTime()).toBeLessThanOrEqual(now.getTime() + MILLISECONDS_IN_SECOND);
                expect(allocationAlterUnstake.releaseTime.getTime()).toBe(allocationAlterUnstake.unstakeTime.getTime() + StakingContract.getReleaseDays() * MILLISECONDS_IN_SECOND * SECONDS_IN_DAY);
                
                // Verify settings update: total_staked decreases and total_releasing increases by the staked amount
                const updatedSettings = await stakeContract.getSettings();

                expect(assetToAmount(updatedSettings.totalStaked) - assetToAmount(stakeSettings.totalStaked)).toBeCloseTo(-assetToAmount(stakeAmount));
                expect(assetToAmount(updatedSettings.totalReleasing) - assetToAmount(stakeSettings.totalReleasing)).toBeCloseTo(assetToAmount(stakeAmount));
            });
      
            test('Fails if unstake is requested twice for the same allocation', async () => {
                expect.assertions(2)
                await sleepUntil(addSeconds(allocation.unstakeableTime, 1));
                const unstakeTrx1 = await stakeContract.requestUnstake(accountName, allocationId, accountSigner);

                expect(unstakeTrx1.processed.receipt.status).toBe('executed');
      
                // Second unstake request should fail.
                try {
                    await sleep(1000);
                    await stakeContract.requestUnstake(accountName, allocationId, accountSigner);
                } catch (e) {
                    expect(e.error.details[0].message).toContain("Unstake already requested");
                }
            });
      
            test('Fails if requnstake() is not signed by the staker', async () => {
                expect.assertions(1);
                const wrongSigner = createSigner(PrivateKey.generate("K1"));

                try {
                    await stakeContract.requestUnstake(accountName, allocationId, wrongSigner);
                } catch (e) {
                    expect(e.error.details[0].message).toContain("transaction declares authority");
                }
            });

            test('Fails requnstake if tokens are no longer locked up', async () => {
                expect.assertions(1);
         
                try {
                    await stakeContract.requestUnstake(accountName, allocationId, accountSigner);
                } catch (e) {
                    expect(e.error.details[0].message).toContain("Tokens are still locked up");
                }
            });
        });
      
        test('Fails requnstake for a non-existent allocation', async () => {
            expect.assertions(1);

            try {
                await stakeContract.requestUnstake(accountName, 9999, accountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Staking allocation not found");
            }
        });
    });
      
    describe('releasetoken()', () => {
        let allocation: StakingAllocationDetails;
        let allocationId: number;
  
        beforeEach(async () => {
            // Stake tokens and retrieve the allocation id
            await stakeContract.stakeTokens(accountName, stakeAmount, accountSigner);
            const allocations = await stakeContract.getAllocations(accountName, stakeSettings);

            allocation = allocations[0];
            allocationId = allocation.id;
            stakeSettings = await stakeContract.getSettings();
        });

        // Tests that require an unstake request to have been made
        describe('when unstake has been requested', () => {
            beforeEach(async () => {
                await sleepUntil(addSeconds(allocation.unstakeableTime, 1));
                await stakeContract.requestUnstake(accountName, allocationId, accountSigner);
                const allocations = await stakeContract.getAllocations(accountName, stakeSettings);

                allocation = allocations[0];
                allocationId = allocation.id;
                stakeSettings = await stakeContract.getSettings();
            });

            test('Successfully finalize unstake after release period and update tables', async () => {
                expect.assertions(10);
                await sleepUntil(addSeconds(allocation.releaseTime, 1));
                const releaseTrx = await stakeContract.releaseToken(accountName, allocationId, accountSigner);

                expect(releaseTrx.processed.receipt.status).toBe('executed');

                // check the inline action sends the stake amount
                const inlineActions = releaseTrx.processed.action_traces[0].inline_traces;

                expect(inlineActions.length).toBe(1);
                expect(inlineActions[0].act.name).toBe("transfer");
                expect(inlineActions[0].act.account).toBe("eosio.token");
                const data = inlineActions[0].act.data;

                expect(data.to).toBe(accountName);
                expect(data.from).toBe(stakeContract.contractName);
                expect(data.quantity).toBe(allocation.staked);
                expect(data.memo).toBe("unstake tokens");

                // Verify that the allocation is removed from the table
                const allocations = await stakeContract.getAllocations(accountName, stakeSettings);

                expect(allocations.find(a => a.id === allocationId)).toBeUndefined();

                // Verify settings update: total_releasing decreases accordingly (should be zero if only one allocation)
                const updatedSettings = await stakeContract.getSettings();

                expect(assetToAmount(updatedSettings.totalReleasing)-assetToAmount(stakeSettings.totalReleasing)).toBeCloseTo(-assetToAmount(stakeAmount));
            });

            test('Fails releasetoken if release period not completed', async () => {
                expect.assertions(1);

                // Do not wait for the release period to elapse
                try {
                    await stakeContract.releaseToken(accountName, allocationId, accountSigner);
                } catch (e) {
                    expect(e.error.details[0].message).toContain("Release period not yet completed");
                }
            });
        });

        test('Fails releasetoken for non-existent allocation', async () => {
            expect.assertions(1);

            try {
                await stakeContract.releaseToken(accountName, 9999, accountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Staking allocation not found");
            }
        });

        test('Fails releasetoken if unstake not requested', async () => {
            expect.assertions(1);

            try {
                await stakeContract.releaseToken(accountName, allocationId, accountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Unstake not requested");
            }
        });

        test('Fails releasetoken if not signed by the staker', async () => {
            expect.assertions(1);

            const wrongSigner = createSigner(PrivateKey.generate("K1"));

            try {
                await stakeContract.releaseToken(accountName, allocationId, wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority");
            }
        });
    });
    
    describe('cron()', () => {
        test('cron() can be called successfully with contract authority', async () => {
            const cronTrx = await stakeContract.cron(signer);

            expect(cronTrx.processed.receipt.status).toBe('executed');
        });
      
        test('cron() fails when called with an unauthorized signer', async () => {
            expect.assertions(1);
            const wrongSigner = createSigner(PrivateKey.generate("K1"));

            try {
                await stakeContract.cron(wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority");
            }
        });
      
        test('cron() distributes yield over two staking cycles', async () => {
            // Use a large stake to minimize rounding issues.
            const largeStake = "1000000.000000 LEOS";

            await eosioTokenContract.transfer("coinsale.tmy", accountName, largeStake, "testing LEOS", signer);
            await stakeContract.stakeTokens(accountName, largeStake, accountSigner);
      
            // Retrieve initial data
            const allocationsBefore = await stakeContract.getAllocations(accountName, stakeSettings);

            stakeSettings = await stakeContract.getSettings();

            if (allocationsBefore.length === 0) {
                throw new Error("No allocation found");
            }

            const initialAllocation = allocationsBefore[0];
            const initialStaked = assetToAmount(initialAllocation.staked);
            const accountBefore = await stakeContract.getAccount(accountName);
            const lastPayoutTime = accountBefore.lastPayout.getTime();
            const initialAccountYield = assetToAmount(accountBefore.totalYield);
            const settingsBefore = await stakeContract.getSettings();
            const initialTotalStaked = assetToAmount(settingsBefore.totalStaked);
            const initialYieldPool = assetToAmount(settingsBefore.currentYieldPool);
      
            // Wait for one full staking cycles
            await sleep(StakingContract.getStakingCycleHours() * 3600 * 1000);
            const accountAfter = await stakeContract.getAccount(accountName);

            const payoutAfterCycle = accountAfter.lastPayout.getTime();

            expect(payoutAfterCycle).toBeGreaterThan(lastPayoutTime)

            // Wait for one full staking cycles
            await sleep(StakingContract.getStakingCycleHours() * 3600 * 1000);
      
            // Retrieve updated values
            const allocationsAfter = await stakeContract.getAllocations(accountName, stakeSettings);
            const updatedAllocation = allocationsAfter.find(a => a.id === initialAllocation.id);

            if (!updatedAllocation) {
                throw new Error("Allocation disappeared unexpectedly");
            }

            const updatedStaked = assetToAmount(updatedAllocation.staked);
            const accountAfter2Cycles = await stakeContract.getAccount(accountName);
            const updatedAccountYield = assetToAmount(accountAfter2Cycles.totalYield);
            const settingsAfter = await stakeContract.getSettings();
            const updatedTotalStaked = assetToAmount(settingsAfter.totalStaked);
            const updatedYieldPool = assetToAmount(settingsAfter.currentYieldPool);
      
            // Compute elapsed time in microseconds between payouts
            const payoutAfter2Cycles = accountAfter2Cycles.lastPayout.getTime();

            expect(payoutAfter2Cycles).toBeGreaterThan(payoutAfterCycle);
            const elapsedMicroseconds = (payoutAfter2Cycles - lastPayoutTime) * 1000; // ms -> µs
      
            // Expected yield using the contract's formula:
            // expected_yield = stake * ( (1 + apy)^(elapsed / MICROSECONDS_PER_YEAR) - 1 )
            const MICROSECONDS_PER_YEAR = 365.25 * 24 * 3600 * 1e6;
            const apy = stakeSettings.apy; // from settings obtained earlier
            const expectedYield = initialStaked * (Math.pow(1 + apy, elapsedMicroseconds / MICROSECONDS_PER_YEAR) - 1);
      
            // Check that allocation's staked amount increased by roughly the expected yield
            expect(updatedStaked - initialStaked).toBeCloseTo(expectedYield, 6);
      
            // Check that the account's total yield increased by roughly the same amount
            expect(updatedAccountYield - initialAccountYield).toBeCloseTo(expectedYield, 6);
      
            // Check that settings.totalStaked increased by about the expected yield
            expect(updatedTotalStaked - initialTotalStaked).toBeCloseTo(expectedYield, 6);
      
            // Check that settings.currentYieldPool decreased by about the expected yield
            expect(initialYieldPool - updatedYieldPool).toBeCloseTo(expectedYield, 6);
        }, 2 * StakingContract.getStakingCycleHours() * 3600 * 1000 + 10000);
      
        // Test 4: Check that cron() does nothing when there are no staking allocations
        test('cron() does not change settings if no staking accounts exist', async () => {
            // For this test we assume a new random account that has not staked
            // (i.e. its staking account is not present in the staking_accounts table).
            // Retrieve settings before calling cron()
            await resetContract();
            const settingsBefore = await stakeContract.getSettings();

            await sleep(StakingContract.getStakingCycleHours() * 3600 * 1000);
            const settingsAfter = await stakeContract.getSettings();

            // Expect no changes in yield-related values.
            expect(settingsAfter.currentYieldPool).toBe(settingsBefore.currentYieldPool);
            expect(settingsAfter.totalStaked).toBe(settingsBefore.totalStaked);
        });
    });
      
      
});
