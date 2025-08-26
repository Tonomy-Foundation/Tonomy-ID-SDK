/* eslint-disable prettier/prettier */
import {
    amountToAsset,
    assetToAmount,
    createKeyManagerSigner,
    createSigner,
    getTonomyOperationsKey,
    Signer,
    StakingAllocation,
    getStakingContract,
    StakingContract,
    StakingSettings,
    getTokenContract,
} from '../../../../src/sdk/services/blockchain';
import { KeyManagerLevel } from '../../../../src/sdk/index';
import { jest } from '@jest/globals';
import { createRandomID } from '../../../helpers/user';
import { addSeconds, MILLISECONDS_IN_SECOND, SECONDS_IN_DAY, sleepUntil, sleep, SECONDS_IN_YEAR, SECONDS_IN_HOUR} from '../../../../src/sdk/util/time';
import { PrivateKey } from '@wharfkit/antelope';
import Debug from 'debug';

const debug = Debug('tonomy-sdk-tests:services:staking-contract');
const signer = createSigner(getTonomyOperationsKey());

const yieldPool = amountToAsset(StakingContract.yearlyStakePool / 2, 'TONO');
const cycleSeconds = StakingContract.getStakingCycleHours() * SECONDS_IN_HOUR;

async function resetContract() {
    await getStakingContract().resetAll(signer);
    await getStakingContract().setSettings(amountToAsset(StakingContract.yearlyStakePool, 'TONO'), signer);
    await getStakingContract().addYield('infra.tmy', yieldPool, signer); // 6 months budget in the account
}

describe('StakingContract Staking Tests', () => {
    jest.setTimeout(60000);

    let accountName: string;
    let accountSigner: Signer;
    let stakeSettings: StakingSettings;
    const stakeAmount = "1.000000 TONO";

    beforeEach(async () => {
        // Create a random user
        const { user } = await createRandomID();

        accountName = (await user.getAccountName()).toString()
        accountSigner = createKeyManagerSigner(user.keyManager, KeyManagerLevel.ACTIVE);

        // Issue tokens to the test account
        await getTokenContract().transfer("coinsale.tmy", accountName, '10.000000 TONO', "testing TONO", signer);
        stakeSettings = await getStakingContract().getSettings();
    });

    describe('setsettings()', () => {
        test('Successfully update settings with valid asset', async () => {
            const newYearlyStakePool = "100.000000 TONO";
            const trx = await getStakingContract().setSettings(newYearlyStakePool, signer);

            expect(trx.processed.receipt.status).toBe('executed');

            const updatedSettings = await getStakingContract().getSettings();

            expect(updatedSettings.yearlyStakePool).toBe(newYearlyStakePool);

            // Revert settings to previous
            await getStakingContract().setSettings(amountToAsset(StakingContract.yearlyStakePool, 'TONO'), signer);
        });

        test('Fails update with wrong asset symbol', async () => {
            expect.assertions(1);

            try {
                await getStakingContract().setSettings("100.000000 EOS", signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Symbol does not match system resource currency");
            }
        });

        test('Fails update with zero amount', async () => {
            expect.assertions(1);

            try {
                await getStakingContract().setSettings("0.000000 TONO", signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Amount must be greater than 0");
            }
        });

        test('Fails update with unauthorized signer', async () => {
            expect.assertions(1);
            const wrongSigner = createSigner(PrivateKey.generate("K1"));

            try {
                await getStakingContract().setSettings("100.000000 TONO", wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority");
            }
        });
    });

    describe('addyield()', () => {
        test('Successfully add yield tokens', async () => {
            // Get initial yield pool from settings
            const initialSettings = await getStakingContract().getSettings();
            const initialYield = assetToAmount(initialSettings.currentYieldPool);

            const additionalYield = "10.000000 TONO";
            const trx = await getStakingContract().addYield("infra.tmy", additionalYield, signer);

            expect(trx.processed.receipt.status).toBe('executed');

            const updatedSettings = await getStakingContract().getSettings();
            const updatedYield = assetToAmount(updatedSettings.currentYieldPool);

            // Verify that the current yield pool has increased by the yield amount
            expect(updatedYield - initialYield).toBeCloseTo(assetToAmount(additionalYield));
        });

        test('Fails add yield if below minimum amount', async () => {
            expect.assertions(1);

            try {
                await getStakingContract().addYield("infra.tmy", "0.500000 TONO", signer);
            } catch (e) {
                debug('Fails add yield if below minimum amount', e)
                expect(e.error.details[0].message).toContain("Amount must be greater than or equal to 1.000000 TONO");
            }
        });

        test('Fails add yield with wrong asset symbol', async () => {
            expect.assertions(1);

            try {
                await getStakingContract().addYield("infra.tmy", "1.000000 EOS", signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Symbol does not match system resource currency");
            }
        });

        test('Fails add yield with zero amount', async () => {
            expect.assertions(1);

            try {
                await getStakingContract().addYield("infra.tmy", "0.000000 TONO", signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Amount must be greater than 0");
            }
        });

        test('Fails add yield with unauthorized signer', async () => {
            expect.assertions(1);
            const wrongSigner = createSigner(PrivateKey.generate("K1"));

            try {
                await getStakingContract().addYield("infra.tmy", stakeAmount, wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority");
            }
        });
    });

    describe('staketokens()', () => {
        test('Stake tokens and verify staking allocation and table updates', async () => {
            expect.assertions(15);
    
            const now = new Date();
            const trx = await getStakingContract().stakeTokens(accountName, stakeAmount, accountSigner);

            expect(trx.processed.receipt.status).toBe('executed');
    
            // Retrieve staking allocation table and verify allocation details
            const allocations = await getStakingContract().getAllocations(accountName, stakeSettings);

            expect(allocations.length).toBe(1);
    
            const allocation = allocations[0];

            expect(allocation.initialStake).toBe(stakeAmount);
            expect(allocation.staked).toBe(stakeAmount);
            expect(allocation.yieldSoFar).toBe(amountToAsset(0, "TONO"));
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
                    'TONO'
                )
            );
    
            // Verify that the settings table has been updated
            const updatedSettings = await getStakingContract().getSettings();

            // total_staked should have increased by stakeAmount.
            expect(assetToAmount(updatedSettings.totalStaked)-assetToAmount(stakeSettings.totalStaked)).toBeCloseTo(assetToAmount(stakeAmount));

            // Verify that the staking account table has been updated.
            const accountData = await getStakingContract().getAccount(accountName);

            expect(accountData.staker.toString()).toBe(accountName);
            expect(accountData.lastPayout.toString()).toBe(allocation.stakedTime.toString())
            expect(accountData.totalYield).toBe(amountToAsset(0, "TONO"));
            expect(accountData.version).toBe(1);
        });
    
        test('Fails staking tokens with invalid staker account (below allowed range)', async () => {
            expect.assertions(1);
            const invalidAccount = "ops.tmy"; // below p111111111111

            try {
                await getStakingContract().stakeTokens(invalidAccount, stakeAmount, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Invalid staker account");
            }
        });
    
        test('Fails staking tokens with staker above allowed range', async () => {
            expect.assertions(1);
            const invalidStaker = "tonomy"; // above pzzzzzzzzzz

            try {
                await getStakingContract().stakeTokens(invalidStaker, stakeAmount, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Invalid staker account");
            }
        });
    
        test('Fails staking tokens with incorrect asset precision', async () => {
            expect.assertions(1);

            try {
                await getStakingContract().stakeTokens(accountName, "1.0 TONO", accountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Symbol does not match system resource");
            }
        });
    
        test('Fails staking tokens with incorrect asset symbol', async () => {
            expect.assertions(1);

            try {
                await getStakingContract().stakeTokens(accountName, "1.000000 EOS", accountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Symbol does not match system resource currency");
            }
        });
    
        test('Stake tokens twice and verify both allocations are present', async () => {
            expect.assertions(3);
            // Stake twice
            await getStakingContract().stakeTokens(accountName, "1.000000 TONO", accountSigner);
            await getStakingContract().stakeTokens(accountName, "2.000000 TONO", accountSigner);
    
            const allocations = await getStakingContract().getAllocations(accountName, stakeSettings);

            expect(allocations.length).toBe(2);
            expect(allocations[0].staked).toBe("1.000000 TONO");
            expect(allocations[1].staked).toBe("2.000000 TONO");
        });
    
        test('getAccountState() returns correct aggregated values', async () => {
            expect.assertions(10);
            await getStakingContract().stakeTokens(accountName, "1.000000 TONO", accountSigner);
            await getStakingContract().stakeTokens(accountName, "2.000000 TONO", accountSigner);
    
            // Retrieve full account and allocations data
            const fullData = await getStakingContract().getAccountState(accountName);

            // totalStaked should equal sum of staked amounts from active allocations (1 + 2 = 3 TONO)
            expect(fullData.totalStaked).toBeCloseTo(3);
            // estimatedMonthlyYield should equal the sum of monthly yields for each allocation.
            const expectedYield1 = assetToAmount("1.000000 TONO") * (Math.pow(1 + stakeSettings.apy, 1 / 12) - 1);
            const expectedYield2 = assetToAmount("2.000000 TONO") * (Math.pow(1 + stakeSettings.apy, 1 / 12) - 1);

            expect(fullData.estimatedMonthlyYield).toBeCloseTo(expectedYield1 + expectedYield2);
            expect(fullData.allocations.length).toBe(2);
            expect(fullData.lastPayout.getTime()).toBeGreaterThanOrEqual(fullData.allocations[0].stakedTime.getTime());
            expect(fullData.lastPayout.getTime()).toBeLessThanOrEqual(fullData.allocations[0].stakedTime.getTime() + MILLISECONDS_IN_SECOND);
            expect(fullData.staker.toString()).toBe(accountName);
            expect(fullData.totalYield).toBe(amountToAsset(0, "TONO"));
            expect(fullData.version).toBe(1);
            expect(fullData.totalUnlockable).toBe(0);
            expect(fullData.totalUnlocking).toBe(0);
        });
    
        test('Fails staking tokens if not signed by the staker account', async () => {
            expect.assertions(1);
            const wrongSigner = createSigner(PrivateKey.generate("K1"));

            try {
                await getStakingContract().stakeTokens(accountName, stakeAmount, wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority");
            }
        });

        test('APY decreases when additional stake is added, and increases when stake is removed', async () => {
            expect.assertions(20);
            await resetContract();
            const yearlyStakePool = "1000.000000 TONO";
            const stakeAmount = "1000.000000 TONO";

            // Set a fixed yearly stake pool.
            await getStakingContract().setSettings(yearlyStakePool, signer);
            const settingsStart = await getStakingContract().getSettings();

            expect(settingsStart.apy).toBeCloseTo(1.0, 6);
            expect(settingsStart.currentYieldPool).toBe(yieldPool);
            expect(settingsStart.totalStaked).toBe("0.000000 TONO");
            expect(settingsStart.totalReleasing).toBe("0.000000 TONO");
            expect(settingsStart.yearlyStakePool).toBe(yearlyStakePool);

            // Staker1 stakes 1000 TONO.
            await getTokenContract().transfer("coinsale.tmy", accountName, stakeAmount, "testing TONO", signer);
            await getStakingContract().stakeTokens(accountName, stakeAmount, accountSigner);
            const settings1 = await getStakingContract().getSettings();
            
            expect(settings1.apy).toBeCloseTo(1.0, 6); // Expected: 1000/1000 = 1.0.
            expect(settings1.currentYieldPool).toBe(yieldPool);
            expect(settings1.totalStaked).toBe(stakeAmount);
            expect(settings1.totalReleasing).toBe("0.000000 TONO");
            expect(settings1.yearlyStakePool).toBe(yearlyStakePool);
                      
            // Create a second staker.
            const { user: user2 } = await createRandomID();
            const accountName2 = (await user2.getAccountName()).toString();
            const accountSigner2 = createKeyManagerSigner(user2.keyManager, KeyManagerLevel.ACTIVE);

            await getTokenContract().transfer("coinsale.tmy", accountName2, stakeAmount, "testing", signer);
            await getStakingContract().stakeTokens(accountName2, stakeAmount, accountSigner2);
            const settings2 = await getStakingContract().getSettings();

            expect(settings2.apy).toBeCloseTo(0.5, 6); // Expected: 1000/2000 = 0.5.
            expect(settings2.currentYieldPool).toBe(yieldPool);
            expect(settings2.totalStaked).toBe(amountToAsset(assetToAmount(stakeAmount) * 2, "TONO"));
            expect(settings2.totalReleasing).toBe("0.000000 TONO");
            expect(settings2.yearlyStakePool).toBe(yearlyStakePool);
          
            // Have staker1 request unstake.
            const allocations1 = await getStakingContract().getAllocations(accountName, settings2);
            const allocationId1 = allocations1[0].id;

            // Wait until lockup period expires.
            await sleepUntil(addSeconds(allocations1[0].unstakeableTime, 1));
            await getStakingContract().requestUnstake(accountName, allocationId1, accountSigner);
            const settings3 = await getStakingContract().getSettings();

            expect(settings3.apy).toBeCloseTo(1.0, 6); // Expected: total staked decreases back to 1000, so APY = 1.0.
            expect(settings3.currentYieldPool).toBe(yieldPool);
            expect(settings3.totalStaked).toBe(stakeAmount);
            expect(settings3.totalReleasing).toBe(stakeAmount);
            expect(settings3.yearlyStakePool).toBe(yearlyStakePool);
        });
   
    });
    
    describe('requnstake()', () => {
        // Tests that depend on the user having already staked tokens
        describe('when staketokens() has already been called by the user', () => {
            let allocation: StakingAllocation;
            let allocationId: number;
      
            beforeEach(async () => {
                // Stake tokens and retrieve the allocation id
                await getStakingContract().stakeTokens(accountName, stakeAmount, accountSigner);
                const allocations = await getStakingContract().getAllocations(accountName, stakeSettings);

                allocation = allocations[0];
                allocationId = allocation.id;
            });
      
            test('Successfully request unstake after lockup period and update tables', async () => {
                expect.assertions(7);

                await sleepUntil(addSeconds(allocation.unstakeableTime, 1));
                const now = new Date();

                stakeSettings = await getStakingContract().getSettings();
                const unstakeTrx = await getStakingContract().requestUnstake(accountName, allocationId, accountSigner);

                expect(unstakeTrx.processed.receipt.status).toBe('executed');

                // Verify the allocation is updated
                const allocations = await getStakingContract().getAllocations(accountName, stakeSettings);
                const allocationAlterUnstake = allocations.find(a => a.id === allocationId);

                if(!allocationAlterUnstake) throw new Error("Allocation not found");
                expect(allocationAlterUnstake.unstakeRequested).toBe(true);
                expect(allocationAlterUnstake.unstakeTime.getTime()).toBeGreaterThan(now.getTime());
                expect(allocationAlterUnstake.unstakeTime.getTime()).toBeLessThanOrEqual(now.getTime() + MILLISECONDS_IN_SECOND);
                expect(allocationAlterUnstake.releaseTime.getTime()).toBe(allocationAlterUnstake.unstakeTime.getTime() + StakingContract.getReleaseDays() * MILLISECONDS_IN_SECOND * SECONDS_IN_DAY);
                
                // Verify settings update: total_staked decreases and total_releasing increases by the staked amount
                const updatedSettings = await getStakingContract().getSettings();

                expect(assetToAmount(updatedSettings.totalStaked) - assetToAmount(stakeSettings.totalStaked)).toBeCloseTo(-assetToAmount(stakeAmount));
                expect(assetToAmount(updatedSettings.totalReleasing) - assetToAmount(stakeSettings.totalReleasing)).toBeCloseTo(assetToAmount(stakeAmount));       
             
            });
      
            test('Fails if unstake is requested twice for the same allocation', async () => {
                expect.assertions(2)
                await sleepUntil(addSeconds(allocation.unstakeableTime, 1));
                const unstakeTrx1 = await getStakingContract().requestUnstake(accountName, allocationId, accountSigner);

                expect(unstakeTrx1.processed.receipt.status).toBe('executed');
      
                // Second unstake request should fail.
                try {
                    await sleep(1000);
                    await getStakingContract().requestUnstake(accountName, allocationId, accountSigner);
                } catch (e) {
                    expect(e.error.details[0].message).toContain("Unstake already requested");
                }
            });
      
            test('Fails if requnstake() is not signed by the staker', async () => {
                expect.assertions(1);
                const wrongSigner = createSigner(PrivateKey.generate("K1"));

                try {
                    await getStakingContract().requestUnstake(accountName, allocationId, wrongSigner);
                } catch (e) {
                    expect(e.error.details[0].message).toContain("transaction declares authority");
                }
            });

            test('Fails requnstake if tokens are no longer locked up', async () => {
                expect.assertions(1);
         
                try {
                    await getStakingContract().requestUnstake(accountName, allocationId, accountSigner);
                } catch (e) {
                    expect(e.error.details[0].message).toContain("Tokens are still locked up");
                }
            });
        });
      
        test('Fails requnstake for a non-existent allocation', async () => {
            expect.assertions(1);

            try {
                await getStakingContract().requestUnstake(accountName, 9999, accountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Staking allocation not found");
            }
        });

       
    });
      
    describe('releasetoken()', () => {
        let allocation: StakingAllocation;
        let allocationId: number;
  
        beforeEach(async () => {
            // Stake tokens and retrieve the allocation id
            await getStakingContract().stakeTokens(accountName, stakeAmount, accountSigner);
            const allocations = await getStakingContract().getAllocations(accountName, stakeSettings);

            allocation = allocations[0];
            allocationId = allocation.id;
            stakeSettings = await getStakingContract().getSettings();
        });

        // Tests that require an unstake request to have been made
        describe('when unstake has been requested', () => {
            beforeEach(async () => {
                await sleepUntil(addSeconds(allocation.unstakeableTime, 1));
                await getStakingContract().requestUnstake(accountName, allocationId, accountSigner);
                const allocations = await getStakingContract().getAllocations(accountName, stakeSettings);

                allocation = allocations[0];
                allocationId = allocation.id;
            });

            test('Successfully finalize unstake after release period and update tables', async () => {
                expect.assertions(12);
                await sleepUntil(addSeconds(allocation.releaseTime, 1));
                stakeSettings = await getStakingContract().getSettings();
                const releaseTrx = await getStakingContract().releaseToken(accountName, allocationId, accountSigner);

                debug("releaseTrx", releaseTrx)
                expect(releaseTrx.processed.receipt.status).toBe('executed');

                // check the inline action sends the stake amount
                const inlineActions = releaseTrx.processed.action_traces[0].inline_traces;

                debug("inlineActions inlineActions", inlineActions)
                expect(inlineActions.length).toBe(2);
                expect(inlineActions[0].act.name).toBe("releasetoken");
                expect(inlineActions[0].act.account).toBe("staking.tmy");
                expect(inlineActions[1].act.name).toBe("transfer");
                expect(inlineActions[1].act.account).toBe("eosio.token");
                const data = inlineActions[1].act.data;

                expect(data.to).toBe(accountName);
                expect(data.from).toBe(getStakingContract().contractName.toString());
                expect(data.quantity).toBe(allocation.staked);
                expect(data.memo).toBe("unstake tokens");

                // Verify that the allocation is removed from the table
                const allocations = await getStakingContract().getAllocations(accountName, stakeSettings);

                expect(allocations.find(a => a.id === allocationId)).toBeUndefined();

                // Verify settings update: total_releasing decreases accordingly (should be zero if only one allocation)
                const updatedSettings = await getStakingContract().getSettings();

                expect(assetToAmount(updatedSettings.totalReleasing)-assetToAmount(stakeSettings.totalReleasing)).toBeCloseTo(-assetToAmount(stakeAmount));
            });

            test('Fails releasetoken if release period not completed', async () => {
                expect.assertions(1);

                // Do not wait for the release period to elapse
                try {
                    await getStakingContract().releaseToken(accountName, allocationId, accountSigner);
                } catch (e) {
                    expect(e.error.details[0].message).toContain("Release period not yet completed");
                }
            });
        });

        test('Fails releasetoken for non-existent allocation', async () => {
            expect.assertions(1);

            try {
                await getStakingContract().releaseToken(accountName, 9999, accountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Staking allocation not found");
            }
        });

        test('Fails releasetoken if unstake not requested', async () => {
            expect.assertions(1);

            try {
                await getStakingContract().releaseToken(accountName, allocationId, accountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Unstake not requested");
            }
        });

        test('Fails releasetoken if not signed by the staker', async () => {
            expect.assertions(1);

            const wrongSigner = createSigner(PrivateKey.generate("K1"));

            try {
                await getStakingContract().releaseToken(accountName, allocationId, wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority");
            }
        });
    });
    
    describe('cron()', () => {
        async function getStakingState(): Promise<StakingState> {
            const accountAndAllocations = await getStakingContract().getAccountState(accountName);

            const settings = accountAndAllocations.settings;

            if (accountAndAllocations.allocations.length === 0) throw new Error("No allocation found");
            const allocation = accountAndAllocations.allocations[0];

            const maxCyclePercentageYield = Math.pow(1 + settings.apy, cycleSeconds / SECONDS_IN_YEAR) - 1;

            return {
                allocation:{
                    stakedTime: allocation.stakedTime,
                    staked: assetToAmount(allocation.staked),
                    yieldSoFar: assetToAmount(allocation.yieldSoFar),
                    monthlyYield: assetToAmount(allocation.monthlyYield),
                    cycleYieldMax: assetToAmount(allocation.staked) * maxCyclePercentageYield,
                },
                account: {
                    lastPayoutTime: accountAndAllocations.lastPayout,
                    payments: accountAndAllocations.payments,
                    totalYield: assetToAmount(accountAndAllocations.totalYield),
                },
                settings: {
                    totalStaked: assetToAmount(settings.totalStaked),
                    totalReleasing: assetToAmount(settings.totalReleasing),
                    yieldPool: assetToAmount(settings.currentYieldPool),
                    yearlyStakePool: assetToAmount(settings.yearlyStakePool),
                    maxCyclePercentageYield,
                    apy: settings.apy,
                }
            }
        }

        type StakingState = {
            allocation: {
                stakedTime: Date;
                staked: number;
                yieldSoFar: number;
                monthlyYield: number;
                cycleYieldMax: number;
            };
            account: {
                lastPayoutTime: Date;
                payments: number; // FIXME: not a number type
                totalYield: number;
            };
            settings: {
                totalStaked: number;
                totalReleasing: number;
                yieldPool: number;
                yearlyStakePool: number;
                maxCyclePercentageYield: number;
                apy: number;
            };
        }

        type StakingAllocationLog = {
            now: Date;
            state?: StakingState;
            unstaked?: boolean;
        };
        const WATCH_INTERVAL_MS = 500;

        async function watchAllocation(options: { watching: boolean, stakingAllocationLog: StakingAllocationLog[], watchInternalMs: number}) {
            while (options.watching) {
                const now = new Date();

                try{
                    const state = await getStakingState();

                    options.stakingAllocationLog.push({ now, state })
                    await sleep(options.watchInternalMs);

                } catch(e){
                    if(e.message === "No allocation found") {
                        options.watching = false
                    }       
                }

                
            }
        }

        function printAllocationStateLog(startTime: Date, stakingAllocationLog: StakingAllocationLog[]) {
            const columns = ['Seconds', 'Staked', 'Yield', 'Last Payment', 'Payments', 'Total Staked', 'Total Yield', 'Max Yield'];
            const columnWidths = [7, 14, 8, 24, 8, 14, 8, 9];
            let printString = '\n' + columns.map((c, i) => c.padEnd(columnWidths[i])).join(' | ');

            for (const row of stakingAllocationLog) {
                const seconds = ((row.now.getTime() - startTime.getTime()) / 1000).toFixed(1);
                let printValues = "\n";

                if (row.unstaked) printValues += seconds.padEnd(columnWidths[0]) + ' | UNSTAKED';
                else {
                    if (!row.state) throw new Error("No state found");
                    const values = [
                        seconds,
                        row.state.allocation.staked.toFixed(6),
                        row.state.allocation.yieldSoFar.toFixed(6),
                        row.state.account.lastPayoutTime.toISOString(),
                        row.state.account.payments,
                        row.state.settings.totalStaked.toFixed(6),
                        row.state.account.totalYield.toFixed(6),
                        row.state.allocation.cycleYieldMax.toFixed(6),
                    ];

                    printValues += values.map((v, i) => v.toString().padEnd(columnWidths[i])).join(' | ');
                }

                printString += printValues;
            }

            debug(printString);
        }

        test('can be called successfully with contract authority', async () => {
            const cronTrx = await getStakingContract().cron(signer);

            expect(cronTrx.processed.receipt.status).toBe('executed');
        });
      
        test('fails when called with an unauthorized signer', async () => {
            expect.assertions(1);
            const wrongSigner = createSigner(PrivateKey.generate("K1"));

            try {
                await getStakingContract().cron(wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority");
            }
        });
        
        test('watch and print the account stake and yield', async () => {
            // only run on local machine to understand the staking yield. No tests are run.
            if (process.env.CI) return;
            await resetContract();

            // Use a large stake to minimize rounding issues.
            const largeStake = "1000000.000000 TONO"; // 1M TONO
            const yearlyStakePool = largeStake; // To make APY 1.0

            await getStakingContract().setSettings(yearlyStakePool, signer); // APY 1.0
            await getTokenContract().transfer("coinsale.tmy", accountName, largeStake, "testing TONO", signer);
            await getStakingContract().stakeTokens(accountName, largeStake, accountSigner);
            
            const startTime = new Date();
            const watchAllocationOptions = {
                watching: true,
                stakingAllocationLog: [] as StakingAllocationLog[],
                watchInternalMs: WATCH_INTERVAL_MS
            };

            watchAllocation(watchAllocationOptions);
            const allocations = await getStakingContract().getAllocations(accountName, stakeSettings);

            debug(`Waiting for till end of 2nd staking cycle: (${2*cycleSeconds} seconds)`);
            await sleepUntil(addSeconds(startTime, 2*cycleSeconds));

            debug('Unstaking');
            await getStakingContract().requestUnstake(accountName, allocations[0].id, accountSigner);
            watchAllocationOptions.stakingAllocationLog.push({ now: new Date(), unstaked: true });

            // Wait for one full staking cycles
            debug(`Waiting for till end of 3nd staking cycle: (${cycleSeconds} seconds)`);
            await sleepUntil(addSeconds(startTime, 3*cycleSeconds));
            watchAllocationOptions.watching = false;
            printAllocationStateLog(startTime, watchAllocationOptions.stakingAllocationLog);  
            
        }, 3 * cycleSeconds * 1000 + 10000);

        test(`distributes yield over staking cycles but not after release with APY 1.0 (3x ${cycleSeconds}s)`, async () => {
            expect.assertions(31);
            await resetContract();

            // Use a large stake to minimize rounding issues.
            const largeStake = "1000000.000000 TONO"; // 1M TONO
            const yearlyStakePool = largeStake; // To make APY 1.0

            await getStakingContract().setSettings(yearlyStakePool, signer); // APY 1.0
            const startTime = new Date();
            const watchAllocationOptions = {
                watching: true,
                stakingAllocationLog: [] as StakingAllocationLog[],
                watchInternalMs: WATCH_INTERVAL_MS
            };

            watchAllocation(watchAllocationOptions);
            await getTokenContract().transfer("coinsale.tmy", accountName, largeStake, "testing TONO", signer);
            await getStakingContract().stakeTokens(accountName, largeStake, accountSigner);
      
            const initial = await getStakingState();
            const initialStakedTime = initial.allocation.stakedTime;

            debug('initial', initial);
            
            expect(initial.allocation.staked).toBe(assetToAmount(largeStake));
            expect(initial.account.payments).toBe(0);
            expect(initial.settings.totalStaked).toBe(assetToAmount(largeStake));
            expect(initial.settings.totalReleasing).toBe(0);
            expect(initial.settings.yieldPool).toBe(assetToAmount(yieldPool));
            expect(initial.settings.yearlyStakePool).toBe(assetToAmount(yearlyStakePool));
            expect(initial.settings.totalStaked).toBe(initial.allocation.staked);
            expect(initial.settings.apy).toBeCloseTo(initial.settings.yearlyStakePool / initial.settings.totalStaked, 6);
      
            // Wait for one full staking cycles
            debug(`Waiting for till end of 1st staking cycle: (${cycleSeconds} seconds)`);
            await sleepUntil(addSeconds(initialStakedTime, cycleSeconds+cycleSeconds*0.05));

            const afterOneCycle = await getStakingState();

            debug('afterOneCycle', afterOneCycle);
            
            expect(afterOneCycle.allocation.staked).toBeGreaterThan(initial.allocation.staked);
            expect(afterOneCycle.account.payments).toBe(1);
            expect(afterOneCycle.allocation.staked).toBeLessThanOrEqual(initial.allocation.staked + initial.allocation.cycleYieldMax);
            expect(afterOneCycle.allocation.yieldSoFar).toBeCloseTo(afterOneCycle.allocation.staked - initial.allocation.staked, 6);
            expect(afterOneCycle.allocation.monthlyYield).toBeCloseTo(afterOneCycle.allocation.staked * (Math.pow(1 + afterOneCycle.settings.apy, 1 / 12) - 1), 4);
            expect(afterOneCycle.account.totalYield).toBe(afterOneCycle.allocation.yieldSoFar);
            expect(afterOneCycle.account.lastPayoutTime.getTime()).toBeGreaterThan(initial.account.lastPayoutTime.getTime());
            expect(afterOneCycle.account.lastPayoutTime.getTime()).toBeLessThanOrEqual(initial.account.lastPayoutTime.getTime() + cycleSeconds * MILLISECONDS_IN_SECOND);
            expect(afterOneCycle.settings.totalReleasing).toBe(initial.settings.totalReleasing);
            expect(afterOneCycle.settings.totalStaked).toBe(initial.settings.totalStaked + afterOneCycle.allocation.yieldSoFar);
            expect(afterOneCycle.settings.yieldPool).toBe(initial.settings.yieldPool - afterOneCycle.allocation.yieldSoFar);

            // Wait for one full staking cycles
            debug(`Waiting for till end of 2nd staking cycle: (${cycleSeconds} seconds)`);
            await sleepUntil(addSeconds(initialStakedTime, 2*cycleSeconds+cycleSeconds*0.05));

            const afterTwoCycles = await getStakingState();

            debug('afterTwoCycles', afterTwoCycles);

            expect(afterTwoCycles.allocation.staked).toBeGreaterThan(afterOneCycle.allocation.staked);
            expect(afterTwoCycles.account.payments).toBe(2);
            expect(afterTwoCycles.allocation.staked).toBeLessThanOrEqual(afterOneCycle.allocation.staked + afterOneCycle.allocation.cycleYieldMax);
            expect(afterTwoCycles.allocation.yieldSoFar).toBeCloseTo(afterTwoCycles.allocation.staked - initial.allocation.staked, 6);
            expect(afterTwoCycles.allocation.monthlyYield).toBeCloseTo(afterTwoCycles.allocation.staked * (Math.pow(1 + afterTwoCycles.settings.apy, 1 / 12) - 1), 4);
            expect(afterTwoCycles.account.totalYield).toBe(afterTwoCycles.allocation.yieldSoFar);
            expect(afterTwoCycles.account.lastPayoutTime.getTime()).toBeGreaterThan(afterOneCycle.account.lastPayoutTime.getTime());
            expect(afterTwoCycles.account.lastPayoutTime.getTime()).toBeLessThanOrEqual(afterOneCycle.account.lastPayoutTime.getTime() + cycleSeconds * MILLISECONDS_IN_SECOND);
            expect(afterTwoCycles.settings.totalReleasing).toBe(initial.settings.totalReleasing);
            expect(afterTwoCycles.settings.totalStaked).toBe(initial.settings.totalStaked + afterTwoCycles.allocation.yieldSoFar);
            expect(afterTwoCycles.settings.yieldPool).toBe(initial.settings.yieldPool - afterTwoCycles.allocation.yieldSoFar);

            // Unstake (so that yields stop)
            const allocations = await getStakingContract().getAllocations(accountName, stakeSettings);

            await sleepUntil(addSeconds(allocations[0].unstakeableTime, 1)); // Not needed. Just to show that it should be done.
            await getStakingContract().requestUnstake(accountName, allocations[0].id, accountSigner);

            // Wait for one full staking cycles
            debug(`Waiting for till end of 3rd staking cycle: (${cycleSeconds} seconds)`);
            await sleepUntil(addSeconds(initialStakedTime, 3*cycleSeconds+cycleSeconds*0.05));

            const afterUnstake = await getStakingContract().getAccountState(accountName);

            debug('afterUnstake', afterUnstake);

            expect(afterUnstake.allocations.length).toBe(0);
            watchAllocationOptions.watching = false;
            printAllocationStateLog(startTime, watchAllocationOptions.stakingAllocationLog);  
        }, 3 * cycleSeconds * 1000 + 10000);
      
        test('does not change settings if no staking accounts exist while cron runs', async () => {
            expect.assertions(2);
            await resetContract();
            const settingsBefore = await getStakingContract().getSettings();

            // Wait for staking cycle, then compare settings to before
            debug(`Waiting for one staking cycle: (${cycleSeconds} seconds)`);
            await sleep(cycleSeconds * 1000);
            const settingsAfter = await getStakingContract().getSettings();

            // Expect no changes in yield-related values.
            expect(settingsAfter.currentYieldPool).toBe(settingsBefore.currentYieldPool);
            expect(settingsAfter.totalStaked).toBe(settingsBefore.totalStaked);
        }, cycleSeconds * 1000 + 5000);
    });
   
});