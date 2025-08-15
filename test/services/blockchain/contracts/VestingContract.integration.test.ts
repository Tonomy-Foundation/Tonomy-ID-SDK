/* eslint-disable prettier/prettier */
import { KeyManagerLevel, VestingContract, VestingSettings } from '../../../../src/sdk/index';
import { createRandomID } from '../../../helpers/user';
import {
    Authority,
    Signer,
    assetToAmount,
    createKeyManagerSigner,
    createSigner,
    getTonomyOperationsKey,
    getTokenContract,
    transact,
} from '../../../../src/sdk/services/blockchain';
import { addSeconds, sleepUntil, subtractSeconds, sleep } from '../../../../src/sdk/util';
import { PrivateKey } from '@wharfkit/antelope';
import { createRandomAccount } from '../../../helpers/eosio';
import { msigAction } from './governance';
import { jest } from '@jest/globals';
import Debug from 'debug';
import { getVestingContract } from '../../../../src/sdk/services/blockchain/contracts/VestingContract';

const debug = Debug('tonomy-sdk-tests:services:vesting-contract');

const signer = createSigner(getTonomyOperationsKey());

describe('VestingContract class', () => {
    jest.setTimeout(60000);
    let saleStartDate: Date;
    let launchStartDate: Date;
    let saleStart: string;
    let launchStart: string;
    let accountName: string;
    let accountSigner: Signer;
    let settings: VestingSettings;

    beforeEach(async () => {
        // Create a random user
        const { user } = await createRandomID();

        accountName = (await user.getAccountName()).toString()
        accountSigner = createKeyManagerSigner(user.keyManager, KeyManagerLevel.ACTIVE);

        // Set the sale and launch date
        saleStartDate = new Date();
        saleStart = saleStartDate.toISOString();
        launchStartDate = addSeconds(saleStartDate, 5);
        launchStart = launchStartDate.toISOString();

        await getVestingContract().setSettings(saleStart, launchStart, signer);
        settings = await getVestingContract().getSettings();
    });

    describe('getSettings()', () => {
        test('Successfully set start and launch date', async () => {
            const settings = await getVestingContract().getSettings();

            expect(settings.salesStartDate.toISOString().split('.')[0]).toBe(saleStart.split('.')[0]);
            expect(settings.launchDate.toISOString().split('.')[0]).toBe(launchStart.split('.')[0]);
        });

        test('Unsuccessful if incorrect date format', async () => {
            const salesDate = 'undefined';
            const launchDate = 'undefined';

            try {
                await getVestingContract().setSettings(salesDate, launchDate, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('date parsing failed');
            }
        });

        test('Unsuccessful if not signed by vesting.tmy key', async () => {
            const wrongSigner = createSigner(PrivateKey.generate("K1"));

            try {
                await sleep(1000); // Wait to ensure don't get duplicate transaction error
                await getVestingContract().setSettings(saleStart, launchStart, wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority '{\"actor\":\"vesting.tmy\",\"permission\":\"active\"}', but does not have signatures for it");
            }
        });
    });

    describe('assignTokens()', () => {
        test('Successfully assign tokens to a holder', async () => {
            expect.assertions(12);

            const trx = await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            expect(trx.processed.receipt.status).toBe('executed');
            expect(trx.processed.receipt.cpu_usage_us).toBeLessThan(500);
            const inlineTraces = trx.processed.action_traces[0].inline_traces;

            expect(inlineTraces.length).toBe(2);
            const transferAction = inlineTraces[1].act;

            expect(transferAction.account).toBe('eosio.token');
            expect(transferAction.data.from).toBe('coinsale.tmy');
            expect(transferAction.data.to).toBe('vesting.tmy');
            expect(transferAction.data.quantity).toBe('1.000000 TONO');
            const allocations = await getVestingContract().getAllocations(accountName);

            expect(allocations.length).toBe(1);
            expect(allocations[0].holder).toBe(accountName);
            expect(allocations[0].tokensAllocated).toBe('1.000000 TONO');
            expect(allocations[0].tokensClaimed).toBe('0.000000 TONO');
            expect(allocations[0].vestingCategoryType).toBe(999);
        });

        test('Successfully assign tokens twice to a holder in different categories', async () => {
            expect.assertions(9);

            const trx1 = await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            await sleep(500); // Needs to wait to be in a separate block, otherwise primary key is the same. See https://github.com/Tonomy-Foundation/Tonomy-Contracts/pull/111/commits/93525ff460299b3c97d623da78281524d164868d#diff-603eb802bda54a8100f95221bfed922b002a61284728341bf9221cede61c01c4R71
            const trx2 = await getVestingContract().assignTokens('coinsale.tmy', accountName, '10.000000 TONO', 998, signer);

            expect(trx1.processed.receipt.status).toBe('executed');
            expect(trx2.processed.receipt.status).toBe('executed');
            const allocations = await getVestingContract().getAllocations(accountName);

            expect(allocations.length).toBe(2);
            expect(allocations[0].holder).toBe(accountName);
            expect(allocations[0].tokensAllocated).toBe('1.000000 TONO');
            expect(allocations[0].vestingCategoryType).toBe(999);
            expect(allocations[1].holder).toBe(accountName);
            expect(allocations[1].tokensAllocated).toBe('10.000000 TONO');
            expect(allocations[1].vestingCategoryType).toBe(998);
        });

        test('Unsuccessful assignment due to invalid symbol', async () => {
            expect.assertions(1);

            try {
                await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 EOS', 999, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('Symbol does not match system resource currency');
            }
        });

        test('Unsuccessful assignment due to invalid amount', async () => {
            expect.assertions(1);

            try {
                await getVestingContract().assignTokens('coinsale.tmy', accountName, '-10.000000 TONO', 999, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('Amount must be greater than 0');
            }
        });

        test('Unsuccessful assignment due to invalid precision', async () => {
            expect.assertions(1);

            try {
                await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.0 TONO', 999, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('Symbol does not match system resource currency');
            }
        });

        test('Unsuccessful assignment due to sales not started', async () => {
            expect.assertions(1);
            const salesDate = new Date(Date.now() + 10000).toISOString();
            const launchDate = new Date(Date.now() + 15000).toISOString();

            await getVestingContract().setSettings(salesDate, launchDate, signer);

            try {
                await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('Sale has not yet started');
            }
        });

        test('Unsuccessful assignment due to invalid category', async () => {
            expect.assertions(1);

            try {
                await getVestingContract().assignTokens('coinsale.tmy', accountName, '10.000000 TONO', 100, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('Invalid new vesting category');
            }
        });

        test('Unsuccessful assignment due to depreciated category', async () => {
            expect.assertions(1);

            try {
                await getVestingContract().assignTokens('coinsale.tmy', accountName, '10.000000 TONO', 1, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('New category is depreciated');
            }
        });

        test('Successful when signed by sender of coins key', async () => {
            expect.assertions(1);
            const newAccountKey = PrivateKey.generate("K1")
            const newAccountSigner = createSigner(newAccountKey);
            const authority = Authority.fromKey(newAccountKey.toPublic().toString());

            authority.addCodePermission("vesting.tmy");
            const { name: newAccountName } = await createRandomAccount(authority);

            await getTokenContract().transfer('ops.tmy', newAccountName, '1.000000 TONO', '', signer);
            const trx = await getVestingContract().assignTokens(newAccountName, 'found.tmy', '1.000000 TONO', 999, newAccountSigner);

            expect(trx.processed.receipt.status).toBe('executed');
        });

        test('Unsuccessful if not sender does not add vesting.tmy code permission', async () => {
            expect.assertions(1);
            const newAccountKey = PrivateKey.generate("K1")
            const newAccountSigner = createSigner(newAccountKey);
            const authority = Authority.fromKey(newAccountKey.toPublic().toString());

            const { name: newAccountName } = await createRandomAccount(authority);

            await getTokenContract().transfer('ops.tmy', newAccountName, '1.000000 TONO', '', signer);

            try {
                await getVestingContract().assignTokens(newAccountName, 'found.tmy', '1.000000 TONO', 999, newAccountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority '{\"actor\":\"" + newAccountName.toString() + "\",\"permission\":\"active\"}', but does not have signatures for it");
            }
        });

        test('Unsuccessful if not signed by sender of coins key', async () => {
            expect.assertions(1);
            const newAccountKey = PrivateKey.generate("K1")
            const wrongSigner = createSigner(PrivateKey.generate("K1"));
            const authority = Authority.fromKey(newAccountKey.toPublic().toString());

            authority.addCodePermission("vesting.tmy");
            const { name: newAccountName } = await createRandomAccount(authority);

            await getTokenContract().transfer('ops.tmy', newAccountName, '1.000000 TONO', '', signer);

            try {
                await getVestingContract().assignTokens(newAccountName, 'found.tmy', '1.000000 TONO', 999, wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority '{\"actor\":\"" + newAccountName.toString() + "\",\"permission\":\"active\"}', but does not have signatures for it");
            }
        });

        test(
            'Unsuccessful assignment due to number of purchases',
            async () => {
                expect.assertions(2 + VestingContract.getMaxAllocations());

                for (let i = 0; i < VestingContract.getMaxAllocations(); i++) {
                    debug(`Iteration: ${i+1} / ${VestingContract.getMaxAllocations()}`);
                    const trx = await getVestingContract().assignTokens(
                        'coinsale.tmy',
                        accountName,
                        '1.000000 TONO',
                        999,
                        signer
                    );

                    await sleep(1000); // Wait to ensure don't get duplicate transaction error
                    expect(trx.processed.receipt.status).toBe('executed');
                }

                const allocations = await getVestingContract().getAllocations(accountName);

                expect(allocations.length).toBe(VestingContract.getMaxAllocations());

                try {
                    debug(`Iteration: final`)
                    await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);
                } catch (e) {
                    debug('e', e);
                    expect(e.error.details[0].message).toContain('Too many purchases received on this account.');
                }
            },
            1.5 * VestingContract.getMaxAllocations() * 1000
        );

        test("successfully get account balance ", async () => {
            expect.assertions(4);

            const trx = await getVestingContract().assignTokens('coinsale.tmy', accountName, '2.000000 TONO', 999, signer);

            expect(trx.processed.receipt.status).toBe('executed');
            const balance = await getVestingContract().getBalance(accountName);

            expect(balance).toBe(2);
            const trx2 = await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            expect(trx2.processed.receipt.status).toBe('executed');

            const balance2 = await getVestingContract().getBalance(accountName);

            expect(balance2).toBe(3);
        })

        test("Successfully assign multiple tokens at once", async () => {
            expect.assertions(6 + 10 * 4);

            const sender = 'coinsale.tmy';
            const contract = 'vesting.tmy';
            const { user } = await createRandomID();
            const accountName2 = (await user.getAccountName()).toString()
            const amount = '2.000000 TONO';

            const assignTokensAction = getVestingContract().actions.assignTokens({
                sender,
                holder: accountName,
                amount,
                category: 999,
            })
            const eosioTokenTransferData = {
                from: sender,
                to: contract,
                quantity: amount,
                memo: "Allocated vested funds"
            }

            const assignTokensAction2 = JSON.parse(JSON.stringify(assignTokensAction));

            assignTokensAction2.data.holder = accountName2;

            const actions = [assignTokensAction, assignTokensAction2];

            let vestedBalance = await getVestingContract().getBalance(accountName);
            let vestedBalance2 = await getVestingContract().getBalance(accountName2);
            const senderBalance = await getTokenContract().getBalance(sender);

            expect(vestedBalance).toBe(0);
            expect(vestedBalance2).toBe(0);

            const trx = await transact(actions, signer);
            const actionTraces = trx.processed.action_traces;

            expect(actionTraces.length).toBe(2);

            // vesting.tmy::assigntokens for accountName
            checkAction(actionTraces[0], contract, contract, 'assigntokens', assignTokensAction.data);
            // vesting.tmy::assigntokens account notification
            checkAction(actionTraces[0].inline_traces[0], accountName, contract, 'assigntokens', assignTokensAction.data);
            // eosio.token::transfer
            checkAction(actionTraces[0].inline_traces[1], "eosio.token", "eosio.token", "transfer", eosioTokenTransferData);
            // eosio.token::transfer account notifications (2x)
            checkAction(actionTraces[0].inline_traces[1].inline_traces[0], sender, "eosio.token", "transfer", eosioTokenTransferData)
            checkAction(actionTraces[0].inline_traces[1].inline_traces[1], contract, "eosio.token", "transfer", eosioTokenTransferData);

            // vesting.tmy::assigntokens for accountName2
            checkAction(actionTraces[1], contract, contract, 'assigntokens', assignTokensAction2.data);
            // vesting.tmy::assigntokens account notification
            checkAction(actionTraces[1].inline_traces[0], accountName2, contract, 'assigntokens', assignTokensAction2.data);
            // eosio.token::transfer
            checkAction(actionTraces[1].inline_traces[1], "eosio.token", "eosio.token", "transfer", eosioTokenTransferData)
            // eosio.token::transfer account notifications (2x)
            checkAction(actionTraces[1].inline_traces[1].inline_traces[0], sender, "eosio.token", "transfer", eosioTokenTransferData)
            checkAction(actionTraces[1].inline_traces[1].inline_traces[1], contract, "eosio.token", "transfer", eosioTokenTransferData);

            vestedBalance = await getVestingContract().getBalance(accountName);
            vestedBalance2 = await getVestingContract().getBalance(accountName2);
            const senderBalanceAfter = await getTokenContract().getBalance(sender);

            expect(vestedBalance).toBe(2);
            expect(vestedBalance2).toBe(2);
            expect(senderBalance - senderBalanceAfter).toBe(4);
        })

        test("Successfully assign multiple tokens at once (msig transaction)", async () => {
            expect.assertions(7 + 3 + 10 * 4);

            const sender = 'coinsale.tmy';
            const contract = 'vesting.tmy';
            const { user } = await createRandomID();
            const accountName2 = (await user.getAccountName()).toString()
            const amount = '2.000000 TONO';

            const assignTokensAction = getVestingContract().actions.assignTokens({
                sender,
                holder: accountName,
                amount,
                category: 999,
            })
            const eosioTokenTransferData = {
                from: sender,
                to: contract,
                quantity: amount,
                memo: "Allocated vested funds"
            }

            const assignTokensAction2 = JSON.parse(JSON.stringify(assignTokensAction));

            assignTokensAction2.data.holder = accountName2;

            const actions = [assignTokensAction, assignTokensAction2];

            let vestedBalance = await getVestingContract().getBalance(accountName);
            let vestedBalance2 = await getVestingContract().getBalance(accountName2);
            const senderBalance = await getTokenContract().getBalance(sender);

            expect(vestedBalance).toBe(0);
            expect(vestedBalance2).toBe(0);

            const trx = await msigAction(actions, { satisfyRequireApproval: true });

            if (!trx) throw new Error("Transaction not found");
            const actionTraces = trx.processed.action_traces;

            expect(actionTraces.length).toBe(1)
            const inlineTraces = actionTraces[0].inline_traces;

            expect(inlineTraces.length).toBe(2);
            // vesting.tmy::assigntokens for accountName
            checkAction(inlineTraces[0], contract, contract, 'assigntokens', assignTokensAction.data);
            // vesting.tmy::assigntokens account notification
            checkAction(inlineTraces[0].inline_traces[0], accountName, contract, 'assigntokens', assignTokensAction.data);
            // eosio.token::transfer
            checkAction(inlineTraces[0].inline_traces[1], "eosio.token", "eosio.token", "transfer", eosioTokenTransferData);
            // eosio.token::transfer account notifications (2x)
            checkAction(inlineTraces[0].inline_traces[1].inline_traces[0], sender, "eosio.token", "transfer", eosioTokenTransferData)
            checkAction(inlineTraces[0].inline_traces[1].inline_traces[1], contract, "eosio.token", "transfer", eosioTokenTransferData);

            // vesting.tmy::assigntokens for accountName2
            checkAction(inlineTraces[1], contract, contract, 'assigntokens', assignTokensAction2.data);
            // vesting.tmy::assigntokens account notification
            checkAction(inlineTraces[1].inline_traces[0], accountName2, contract, 'assigntokens', assignTokensAction2.data);
            // eosio.token::transfer
            checkAction(inlineTraces[1].inline_traces[1], "eosio.token", "eosio.token", "transfer", eosioTokenTransferData)
            // eosio.token::transfer account notifications (2x)
            checkAction(inlineTraces[1].inline_traces[1].inline_traces[0], sender, "eosio.token", "transfer", eosioTokenTransferData)
            checkAction(inlineTraces[1].inline_traces[1].inline_traces[1], contract, "eosio.token", "transfer", eosioTokenTransferData);


            vestedBalance = await getVestingContract().getBalance(accountName);
            vestedBalance2 = await getVestingContract().getBalance(accountName2);
            const senderBalanceAfter = await getTokenContract().getBalance(sender);

            expect(vestedBalance).toBe(2);
            expect(vestedBalance2).toBe(2);
            expect(senderBalance - senderBalanceAfter).toBe(4);
        })
    });

    describe('withdraw()', () => {
        test('Successful withdrawal after cliff period', async () => {
            expect.assertions(10);
            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            let allocations = await getVestingContract().getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);
            
            await sleepUntil(addSeconds(vestingPeriod.cliffEnd, 1));
            const trx = await getVestingContract().withdraw(accountName, accountSigner);

            expect(trx.processed.receipt.status).toBe('executed');
            expect(trx.processed.receipt.cpu_usage_us).toBeLessThan(500);
            debug(`CPU usage: ${trx.processed.receipt.cpu_usage_us}`);
            expect(trx.processed.action_traces[0].inline_traces.length).toBe(1);
            const transferTrx = trx.processed.action_traces[0].inline_traces[0];

            expect(transferTrx.act.account).toBe('eosio.token');
            expect(transferTrx.act.name).toBe('transfer');
            expect(transferTrx.act.data.from).toBe('vesting.tmy');
            expect(transferTrx.act.data.to).toBe(accountName);
            const transferAmount = assetToAmount(transferTrx.act.data.quantity);

            expect(transferAmount).toBeLessThan(1.0);
            expect(transferAmount).toBeGreaterThan(0.5);

            allocations = await getVestingContract().getAllocations(accountName);
            const allocatedAmount = assetToAmount(allocations[0].tokensClaimed);

            expect(allocatedAmount).toBe(transferAmount);
        });

        test('Successful withdrawal after vesting period', async () => {
            expect.assertions(2);
            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            let allocations = await getVestingContract().getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            await sleepUntil(addSeconds(vestingPeriod.vestingEnd, 1));
            const trx = await getVestingContract().withdraw(accountName, accountSigner);
            const transferTrx = trx.processed.action_traces[0].inline_traces[0];
            const transferAmount = assetToAmount(transferTrx.act.data.quantity);

            allocations =  await getVestingContract().getAllocations(accountName);
            expect(transferAmount).toBe(1.0);

            expect(allocations.length).toBe(0);
        });

        test('Successful withdrawal with TGE unlock', async () => {
            expect.assertions(8);
            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 998, signer);

            let allocations = await getVestingContract().getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            await sleepUntil(addSeconds(vestingPeriod.vestingStart, 0));
            const trx = await getVestingContract().withdraw(accountName, accountSigner);
            const transferTrx = trx.processed.action_traces[0].inline_traces[0];
            const transferAmount = assetToAmount(transferTrx.act.data.quantity);

            expect(transferAmount).toBeGreaterThan(0.5);
            expect(transferAmount).toBeLessThan(1.0);

            allocations = await getVestingContract().getAllocations(accountName);
            const allocatedAmount = assetToAmount(allocations[0].tokensClaimed);

            expect(allocatedAmount).toBe(transferAmount);

            await sleep(1000);
            const trx2 = await getVestingContract().withdraw(accountName, accountSigner);
            const transferTrx2 = trx2.processed.action_traces[0].inline_traces[0];
            const transferAmount2 = assetToAmount(transferTrx2.act.data.quantity);

            expect(transferAmount2).toBeLessThan(transferAmount);
            expect(transferAmount2).toBeLessThan(1.0 - transferAmount);

            await sleepUntil(addSeconds(vestingPeriod.vestingEnd, 0));
            const trx3 = await getVestingContract().withdraw(accountName, accountSigner);
            const transferTrx3 = trx3.processed.action_traces[0].inline_traces[0];
            const transferAmount3 = assetToAmount(transferTrx3.act.data.quantity);

            expect(transferAmount + transferAmount2 + transferAmount3).toBeCloseTo(1.0, 6);

            const allocations2 = await getVestingContract().getAllocations(accountName);

            expect(allocations2.length).toBe(0);

            await sleep(1000);
            const trx4 = await getVestingContract().withdraw(accountName, accountSigner);

            expect(trx4.processed.action_traces[0].inline_traces.length).toBe(0);
        });

        test('Cannot withdraw more after all already withdrawn', async () => {
            expect.assertions(2);
            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            const allocations = await getVestingContract().getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            await sleepUntil(addSeconds(vestingPeriod.vestingEnd, 1));
            await getVestingContract().withdraw(accountName, accountSigner);
            await sleep(1000); // Wait to ensure don't get duplicate transaction error
            const trx = await getVestingContract().withdraw(accountName, accountSigner);

            expect(trx.processed.action_traces[0].inline_traces.length).toBe(0);

            const allocations2 = await getVestingContract().getAllocations(accountName);

            expect(allocations2.length).toBe(0);
        });

        test('Successful withdrawal during and after vesting period', async () => {
            expect.assertions(5);
            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            let allocations = await getVestingContract().getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            await sleepUntil(addSeconds(vestingPeriod.cliffEnd, 1));
            const trx = await getVestingContract().withdraw(accountName, accountSigner);
            const transferTrx = trx.processed.action_traces[0].inline_traces[0];
            const transferAmount = assetToAmount(transferTrx.act.data.quantity);

            expect(transferAmount).toBeLessThan(1.0);
            expect(transferAmount).toBeGreaterThan(0.5);

            allocations = await getVestingContract().getAllocations(accountName);
            const allocatedAmount = assetToAmount(allocations[0].tokensClaimed);

            expect(allocatedAmount).toBe(transferAmount);

            // Then wait till end of vesting period
            await sleepUntil(addSeconds(vestingPeriod.vestingEnd, 1));
            const trx2 = await getVestingContract().withdraw(accountName, accountSigner);
            const transferTrx2 = trx2.processed.action_traces[0].inline_traces[0];
            const transferAmount2 = assetToAmount(transferTrx2.act.data.quantity);

            expect(transferAmount2).toBeCloseTo(1.0 - transferAmount, 6);

            allocations = await getVestingContract().getAllocations(accountName);

            expect(allocations.length).toBe(0);
        });

        test('Successful 0.0 TONO withdrawal before cliff end', async () => {
            expect.assertions(2);
            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            let allocations = await getVestingContract().getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            await sleepUntil(subtractSeconds(vestingPeriod.cliffEnd, 3));
            const trx = await getVestingContract().withdraw(accountName, accountSigner);

            expect(trx.processed.action_traces[0].inline_traces.length).toBe(0);

            allocations = await getVestingContract().getAllocations(accountName);
            const allocatedAmount = assetToAmount(allocations[0].tokensClaimed);

            expect(allocatedAmount).toBe(0.0);
        });

        test('Successful withdrawal with 2 different allocations of same category', async () => {
            expect.assertions(8);

            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);
            await sleep(1000);
            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            const allocations = await getVestingContract().getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            // 1st withdrawal after allocation cliff end
            await sleepUntil(addSeconds(vestingPeriod.cliffEnd, 1));

            const trx = await getVestingContract().withdraw(accountName, accountSigner);

            const transferAmount = assetToAmount(trx.processed.action_traces[0].inline_traces[0].act.data.quantity);

            const allocations1 = await getVestingContract().getAllocations(accountName);

            expect(assetToAmount(allocations1[0].tokensClaimed)).toBe(transferAmount / 2);
            expect(assetToAmount(allocations1[1].tokensClaimed)).toBe(transferAmount / 2);

            // 2nd withdrawal after a few more seconds
            await sleep(2000);
            const trx2 = await getVestingContract().withdraw(accountName, accountSigner);

            const transferAmount2 = assetToAmount(trx2.processed.action_traces[0].inline_traces[0].act.data.quantity);

            const allocations2 = await getVestingContract().getAllocations(accountName);

            expect(assetToAmount(allocations2[0].tokensClaimed)).toBe(assetToAmount(allocations2[1].tokensClaimed));
            expect(assetToAmount(allocations2[0].tokensClaimed)).toBeGreaterThan(transferAmount / 2);
            expect(assetToAmount(allocations2[0].tokensClaimed)).toBeLessThan(1.0);
            expect(transferAmount2).toBeCloseTo(
                assetToAmount(allocations2[0].tokensClaimed) +
                assetToAmount(allocations2[1].tokensClaimed) -
                transferAmount, 6
            );
           
            // 3rd withdrawal after allocation vesting end
            await sleepUntil(addSeconds(vestingPeriod.vestingEnd, 1));

            const trx3 = await getVestingContract().withdraw(accountName, accountSigner);
            const transferAmount3 = assetToAmount(trx3.processed.action_traces[0].inline_traces[0].act.data.quantity);

            expect(transferAmount + transferAmount2 + transferAmount3).toBeCloseTo(2.0, 6);         
            const allocations4 = await getVestingContract().getAllocations(accountName);

            expect(allocations4.length).toBe(0);

        });

        test('Successful withdrawal with 2 different allocations of different categories', async () => {
            expect.assertions(2);

            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);
            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 997, signer);

            const allocations = await getVestingContract().getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            // 1st withdrawal after 1st allocation vesting end
            await sleepUntil(addSeconds(vestingPeriod.vestingEnd, 1));
            await getVestingContract().withdraw(accountName, accountSigner);

            const allocations1 = await getVestingContract().getAllocations(accountName);

            expect(assetToAmount(allocations1[0].tokensClaimed)).toBe(0.0);

            // Withdraw again
            await sleep(1000); // Wait to ensure don't get duplicate transaction error
            await getVestingContract().withdraw(accountName, accountSigner);
            const allocations2 = await getVestingContract().getAllocations(accountName);

            expect(allocations2.length).toBe(1);

        });

        test('Unsuccessful when launch has not started', async () => {
            expect.assertions(1);
            const settings = await getVestingContract().getSettings();

            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            await sleepUntil(subtractSeconds(new Date(settings.launchDate), 3));

            try {
                await getVestingContract().withdraw(accountName, accountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain('Launch date not yet reached');
            }
        });

        test('Successfully get unlockable, locked, and total allocations', async () => {
            expect.assertions(25);

            const { user } = await createRandomID();
            const accountName = (await user.getAccountName()).toString();
            const accountSigner = createKeyManagerSigner(user.keyManager, KeyManagerLevel.ACTIVE);

            // Assign tokens to the account with a specific vesting category
            const trx = await getVestingContract().assignTokens('coinsale.tmy', accountName, '2.000000 TONO', 999, signer);

            expect(trx.processed.receipt.status).toBe('executed');

            // Check balances before cliff period ends
            let balances = await getVestingContract().getVestingAllocations(accountName);

            expect(balances.totalAllocation).toBe(2);
            expect(balances.unlockable).toBe(0);
            expect(balances.allocationsDetails.length).toBe(1);
            expect(balances.allocationsDetails[0].totalAllocation).toBe(2);
            expect(balances.allocationsDetails[0].locked).toBe(2);
            expect(balances.allocationsDetails[0].unlockAtVestingStart).toBe(0);

            // Wait until after the cliff period ends
            const allocations = await getVestingContract().getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            await sleepUntil(addSeconds(vestingPeriod.cliffEnd, 1));

            // Check balances during vesting period
            balances = await getVestingContract().getVestingAllocations(accountName);
            expect(balances.totalAllocation).toBe(2);
            expect(balances.unlockable).toBeLessThan(2);
            expect(balances.allocationsDetails[0].totalAllocation).toBe(2);
            expect(balances.allocationsDetails[0].locked).toBe(2);
            expect(balances.allocationsDetails[0].unlockAtVestingStart).toBe(0);

            // Wait until after the vesting period ends
            await sleepUntil(addSeconds(vestingPeriod.vestingEnd, 1));

            // Check balances after vesting period ends
            balances = await getVestingContract().getVestingAllocations(accountName);
            expect(balances.totalAllocation).toBe(2);
            expect(balances.unlockable).toBe(2);
            expect(balances.allocationsDetails[0].totalAllocation).toBe(2);
            expect(balances.allocationsDetails[0].locked).toBe(2);
            expect(balances.allocationsDetails[0].unlockAtVestingStart).toBe(0);

            // Withdraw all unlockable tokens
            await getVestingContract().withdraw(accountName, accountSigner);

            // Check balances after withdrawal
            balances = await getVestingContract().getVestingAllocations(accountName);
            expect(balances.totalAllocation).toBe(0);
            expect(balances.unlockable).toBe(0);
            expect(balances.unlocked).toBe(0);
            expect(balances.locked).toBe(0);
            expect(balances.allocationsDetails.length).toBe(0);
          

            const trx2 = await getVestingContract().assignTokens('coinsale.tmy', accountName, '2.000000 TONO', 999, signer);

            expect(trx2.processed.receipt.status).toBe('executed');
            balances = await getVestingContract().getVestingAllocations(accountName);
            expect(balances.allocationsDetails.length).toBe(1);
            expect(balances.totalAllocation).toBe(2);

        });
      
    }); 
    
    describe('vesting progress for unlockable coins getVestingAllocations()', () => {
        test('Track vesting progress for category 998', async () => {
            expect.assertions(5);
            const { user } = await createRandomID();
            const accountName = (await user.getAccountName()).toString();

            // Assign tokens to the account with vesting category 998
            const trx = await getVestingContract().assignTokens('coinsale.tmy', accountName, '4.000000 TONO', 998, signer);

            expect(trx.processed.receipt.status).toBe('executed');

            // Fetch initial balances before vesting starts
            let balances = await getVestingContract().getVestingAllocations(accountName);

            // Ensure initial values are correct
            expect(balances.totalAllocation).toBe(4);
            expect(balances.unlockable).toBe(0);
            expect(balances.unlocked).toBe(0);
            expect(balances.locked).toBe(4);

            // Fetch vesting periods for category 998
            const allocations = await getVestingContract().getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            const { vestingStart, vestingEnd } = vestingPeriod;

            const totalAllocation = balances.totalAllocation;
            const vestingProgress = [];

            // Loop every second until vesting ends
            for (let currentTime = vestingStart.getTime(); currentTime <= vestingEnd.getTime(); currentTime += 1000) {
                await sleepUntil(new Date(currentTime));

                // Fetch updated balances
                balances = await getVestingContract().getVestingAllocations(accountName);

                const allocationDetails = balances.allocationsDetails[0];
                const unlockablePercentage = (allocationDetails.unlockable / totalAllocation) * 100;
                const unlockedPercentage = (allocationDetails.unlocked / totalAllocation) * 100;
                const lockedPercentage = (allocationDetails.locked / totalAllocation) * 100;

                // Store values in array
                vestingProgress.push({
                    time: new Date(currentTime).toISOString(),
                    unlockable: `${unlockablePercentage.toFixed(2)}%`,
                    unlocked: `${unlockedPercentage.toFixed(2)}%`,
                    locked: `${lockedPercentage.toFixed(2)}%`,
                    totalAllocation: `${allocationDetails.totalAllocation.toFixed(6)} TONO`,
                });
            }

            debug("vestingProgress:", vestingProgress);

        });
        test('should calculate the correct allocation date', async () => {
            expect.assertions(2);

            const trx = await getVestingContract().assignTokens(
                'coinsale.tmy',
                accountName,
                '1.000000 TONO',
                999,
                signer 
            );

            expect(trx.processed.receipt.status).toBe('executed');

            const balances = await getVestingContract().getVestingAllocations(accountName);

            const allocationDetails = balances.allocationsDetails[0];
            const allocationDate = allocationDetails.vestingStart;

            const settings = await getVestingContract().getSettings();
            const saleStart = new Date(settings.salesStartDate); 
            const timeSinceSaleStart = allocationDetails.vestingStart.getTime() - saleStart.getTime();

            // Calculate expected allocation date
            const expectedAllocationDate = new Date(saleStart.getTime() + timeSinceSaleStart);

            expect(allocationDate.getTime()).toBeCloseTo(expectedAllocationDate.getTime(), -3);
        });
    });

    describe('migratealloc()', () => {
        test('Successful migrates tokens to new category and higher amount', async () => {
            expect.assertions(7);

            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            const allocations = await getVestingContract().getAllocations(accountName);
            const oldAllocation = allocations[0];

            const trx = await getVestingContract().migrateAllocation('coinsale.tmy', accountName, oldAllocation.id,
                oldAllocation.tokensAllocated, "2.000000 TONO",
                oldAllocation.vestingCategoryType, 998,
                signer);

            const allocations1 = await getVestingContract().getAllocations(accountName);
            const newAllocation = allocations1[0];

            expect(newAllocation.tokensAllocated).toBe('2.000000 TONO');
            expect(newAllocation.vestingCategoryType).toBe(998);

            const transferTrx = trx.processed.action_traces[0].inline_traces[1];

            expect(transferTrx.act.account).toBe('eosio.token');
            expect(transferTrx.act.name).toBe('transfer');
            expect(transferTrx.act.data.from).toBe('coinsale.tmy');
            expect(transferTrx.act.data.to).toBe('vesting.tmy');
            expect(transferTrx.act.data.quantity).toBe('1.000000 TONO');
        });

        test('Successful migrates tokens to new category and lower amount', async () => {
            expect.assertions(7);
            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            const allocations = await getVestingContract().getAllocations(accountName);
            const oldAllocation = allocations[0];

            const trx = await getVestingContract().migrateAllocation('coinsale.tmy', accountName, oldAllocation.id,
                oldAllocation.tokensAllocated, "0.500000 TONO",
                oldAllocation.vestingCategoryType, 998,
                signer);

            const allocations1 = await getVestingContract().getAllocations(accountName);
            const newAllocation = allocations1[0];

            expect(newAllocation.tokensAllocated).toBe('0.500000 TONO');
            expect(newAllocation.vestingCategoryType).toBe(998);

            const transferTrx = trx.processed.action_traces[0].inline_traces[1];

            expect(transferTrx.act.account).toBe('eosio.token');
            expect(transferTrx.act.name).toBe('transfer');
            expect(transferTrx.act.data.to).toBe('coinsale.tmy');
            expect(transferTrx.act.data.from).toBe('vesting.tmy');
            expect(transferTrx.act.data.quantity).toBe('0.500000 TONO');
        });

        test('Successfully withdraws after migration', async () => {
            expect.assertions(1);

            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            const allocations = await getVestingContract().getAllocations(accountName);
            const oldAllocation = allocations[0];

            await getVestingContract().migrateAllocation('coinsale.tmy', accountName, oldAllocation.id,
                oldAllocation.tokensAllocated, "2.000000 TONO",
                oldAllocation.vestingCategoryType, 998,
                signer);

            const allocations2 = await getVestingContract().getAllocations(accountName);
            const vestingPeriod2 = VestingContract.calculateVestingPeriod(settings, allocations2[0]);

            await sleepUntil(vestingPeriod2.vestingEnd);
            const trx = await getVestingContract().withdraw(accountName, accountSigner);
            const transferTrx = trx.processed.action_traces[0].inline_traces[0];
            const transferAmount = assetToAmount(transferTrx.act.data.quantity);

            expect(transferAmount).toBe(2.0);
        });

        test("Unsuccessful if old category does not match", async () => {
            expect.assertions(1);

            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            const allocations = await getVestingContract().getAllocations(accountName);
            const oldAllocation = allocations[0];

            try {
                await getVestingContract().migrateAllocation('coinsale.tmy', accountName, oldAllocation.id,
                    oldAllocation.tokensAllocated, "2.000000 TONO",
                    998, 998,
                    signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Old category does not match existing allocation");
            }
        });

        test("Unsuccessful if old amount does not match", async () => {
            expect.assertions(1);

            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            const allocations = await getVestingContract().getAllocations(accountName);
            const oldAllocation = allocations[0];

            try {
                await getVestingContract().migrateAllocation('coinsale.tmy', accountName, oldAllocation.id,
                    "2.000000 TONO", "2.000000 TONO",
                    oldAllocation.vestingCategoryType, 998,
                    signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Old amount does not match existing allocation");
            }
        });

        test("Successful if some tokens already withdrawn", async () => {
            expect.assertions(5);

            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            const allocations = await getVestingContract().getAllocations(accountName);
            const oldAllocation = allocations[0];

            const allocations2 = await getVestingContract().getAllocations(accountName);
            const vestingPeriod2 = VestingContract.calculateVestingPeriod(settings, allocations2[0]);

            await sleepUntil(vestingPeriod2.cliffEnd);
            const trx1 = await getVestingContract().withdraw(accountName, accountSigner);
            const transferTrx1 = trx1.processed.action_traces[0].inline_traces[0];
            const transferAmount1 = assetToAmount(transferTrx1.act.data.quantity);

            expect(transferAmount1).toBeLessThan(1.0);
            expect(transferAmount1).toBeGreaterThan(0.5);

            await getVestingContract().migrateAllocation('coinsale.tmy', accountName, oldAllocation.id,
                oldAllocation.tokensAllocated, "2.000000 TONO",
                oldAllocation.vestingCategoryType, 998,
                signer);

            const allocations3 = await getVestingContract().getAllocations(accountName);
            const newAllocation = allocations3[0];

            expect(assetToAmount(newAllocation.tokensClaimed)).toBe(transferAmount1);    
            expect(newAllocation.tokensAllocated).toBe('2.000000 TONO');    
            await sleep(1000);
            const trx = await getVestingContract().withdraw(accountName, accountSigner);
            const transferTrx = trx.processed.action_traces[0].inline_traces[0];
            const transferAmount = assetToAmount(transferTrx.act.data.quantity);

            debug("transferAmount", transferAmount)
            expect(transferAmount).toBeGreaterThan(1.0);
        });

        test("Unsuccessful new amount is less than already withdrawn", async () => {
            expect.assertions(1);

            await getVestingContract().assignTokens('coinsale.tmy', accountName, '1.000000 TONO', 999, signer);

            const allocations = await getVestingContract().getAllocations(accountName);
            const oldAllocation = allocations[0];

            const allocations2 = await getVestingContract().getAllocations(accountName);
            const vestingPeriod2 = VestingContract.calculateVestingPeriod(settings, allocations2[0]);

            await sleepUntil(vestingPeriod2.cliffEnd);
            await getVestingContract().withdraw(accountName, accountSigner);

            try {
                await getVestingContract().migrateAllocation('coinsale.tmy', accountName, oldAllocation.id,
                    oldAllocation.tokensAllocated, "0.400000 TONO",
                    oldAllocation.vestingCategoryType, 998,
                    signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("New amount is less than the amount already claimed");
            }
        });
    });
});

function checkAction(action: any, receiver: string, contract: string, name: string, data: object) {
    expect(action.receiver).toBe(receiver)
    expect(action.act.account).toBe(contract);
    expect(action.act.name).toBe(name)
    expect(JSON.stringify(action.act.data)).toBe(JSON.stringify(data))
}