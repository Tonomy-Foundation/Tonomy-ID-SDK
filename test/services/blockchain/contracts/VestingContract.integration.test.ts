/* eslint-disable prettier/prettier */
import { KeyManagerLevel, VestingContract, VestingSettings } from '../../../../src/sdk/index';
import { createRandomID } from '../../../helpers/user';
import {
    Authority,
    EosioTokenContract,
    Signer,
    assetToAmount,
    createKeyManagerSigner,
    createSigner,
    getTonomyOperationsKey,
    transact,
} from '../../../../src/sdk/services/blockchain';
import { sleep } from '../../../helpers/sleep';
import { addSeconds, sleepUntil, subtractSeconds } from '../../../../src/sdk/util';
import { PrivateKey, Name } from '@wharfkit/antelope';
import { createRandomAccount } from '../../../helpers/eosio';
import { msigAction } from './governance';
import { jest } from '@jest/globals';

const vestingContract = VestingContract.Instance;
const eosioTokenContract = EosioTokenContract.Instance;
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

        await vestingContract.setSettings(saleStart, launchStart, signer);
        settings = await vestingContract.getSettings();
    });

    describe('getSettings()', () => {
        test('Successfully set start and launch date', async () => {
            const settings = await vestingContract.getSettings();

            expect(settings.sales_start_date.split('.')[0]).toBe(saleStart.split('.')[0]);
            expect(settings.launch_date.split('.')[0]).toBe(launchStart.split('.')[0]);
        });

        test('Unsuccessful if incorrect date format', async () => {
            const salesDate = 'undefined';
            const launchDate = 'undefined';

            try {
                await vestingContract.setSettings(salesDate, launchDate, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('date parsing failed');
            }
        });

        test('Unsuccessful if not signed by vesting.tmy key', async () => {
            const wrongSigner = createSigner(PrivateKey.generate("K1"));

            try {
                await sleep(1000); // Wait to ensure don't get duplicate transaction error
                await vestingContract.setSettings(saleStart, launchStart, wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority '{\"actor\":\"vesting.tmy\",\"permission\":\"active\"}', but does not have signatures for it");
            }
        });
    });

    describe('assignTokens()', () => {
        test('Successfully assign tokens to a holder', async () => {
            expect.assertions(12);

            const trx = await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            expect(trx.processed.receipt.status).toBe('executed');
            expect(trx.processed.receipt.cpu_usage_us).toBeLessThan(500);
            const inlineTraces = trx.processed.action_traces[0].inline_traces;

            expect(inlineTraces.length).toBe(2);
            const transferAction = inlineTraces[1].act;

            expect(transferAction.account).toBe('eosio.token');
            expect(transferAction.data.from).toBe('coinsale.tmy');
            expect(transferAction.data.to).toBe('vesting.tmy');
            expect(transferAction.data.quantity).toBe('1.000000 LEOS');
            const allocations = await vestingContract.getAllocations(accountName);

            expect(allocations.length).toBe(1);
            expect(allocations[0].holder).toBe(accountName);
            expect(allocations[0].tokens_allocated).toBe('1.000000 LEOS');
            expect(allocations[0].tokens_claimed).toBe('0.000000 LEOS');
            expect(allocations[0].vesting_category_type).toBe(999);
        });

        test('Successfully assign tokens twice to a holder in different categories', async () => {
            expect.assertions(9);

            const trx1 = await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            await sleep(500); // Needs to wait to be in a separate block, otherwise primary key is the same. See https://github.com/Tonomy-Foundation/Tonomy-Contracts/pull/111/commits/93525ff460299b3c97d623da78281524d164868d#diff-603eb802bda54a8100f95221bfed922b002a61284728341bf9221cede61c01c4R71
            const trx2 = await vestingContract.assignTokens('coinsale.tmy', accountName, '10.000000 LEOS', 998, signer);

            expect(trx1.processed.receipt.status).toBe('executed');
            expect(trx2.processed.receipt.status).toBe('executed');
            const allocations = await vestingContract.getAllocations(accountName);

            expect(allocations.length).toBe(2);
            expect(allocations[0].holder).toBe(accountName);
            expect(allocations[0].tokens_allocated).toBe('1.000000 LEOS');
            expect(allocations[0].vesting_category_type).toBe(999);
            expect(allocations[1].holder).toBe(accountName);
            expect(allocations[1].tokens_allocated).toBe('10.000000 LEOS');
            expect(allocations[1].vesting_category_type).toBe(998);
        });

        test('Unsuccessful assignment due to invalid symbol', async () => {
            expect.assertions(1);

            try {
                await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 EOS', 999, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('Symbol does not match system resource currency');
            }
        });

        test('Unsuccessful assignment due to invalid amount', async () => {
            expect.assertions(1);

            try {
                await vestingContract.assignTokens('coinsale.tmy', accountName, '-10.000000 LEOS', 999, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('Amount must be greater than 0');
            }
        });

        test('Unsuccessful assignment due to invalid precision', async () => {
            expect.assertions(1);

            try {
                await vestingContract.assignTokens('coinsale.tmy', accountName, '1.0 LEOS', 999, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('Symbol does not match system resource currency');
            }
        });

        test('Unsuccessful assignment due to sales not started', async () => {
            expect.assertions(1);
            const salesDate = new Date(Date.now() + 10000).toISOString();
            const launchDate = new Date(Date.now() + 15000).toISOString();

            await vestingContract.setSettings(salesDate, launchDate, signer);

            try {
                await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('Sale has not yet started');
            }
        });

        test('Unsuccessful assignment due to invalid category', async () => {
            expect.assertions(1);

            try {
                await vestingContract.assignTokens('coinsale.tmy', accountName, '10.000000 LEOS', 100, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('Invalid new vesting category');
            }
        });

        test('Unsuccessful assignment due to depreciated category', async () => {
            expect.assertions(1);

            try {
                await vestingContract.assignTokens('coinsale.tmy', accountName, '10.000000 LEOS', 1, signer);
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

            await eosioTokenContract.transfer('ops.tmy', newAccountName, '1.000000 LEOS', '', signer);
            const trx = await vestingContract.assignTokens(newAccountName, 'found.tmy', '1.000000 LEOS', 999, newAccountSigner);

            expect(trx.processed.receipt.status).toBe('executed');
        });

        test('Unsuccessful if not sender does not add vesting.tmy code permission', async () => {
            expect.assertions(1);
            const newAccountKey = PrivateKey.generate("K1")
            const newAccountSigner = createSigner(newAccountKey);
            const authority = Authority.fromKey(newAccountKey.toPublic().toString());

            const { name: newAccountName } = await createRandomAccount(authority);

            await eosioTokenContract.transfer('ops.tmy', newAccountName, '1.000000 LEOS', '', signer);

            try {
                await vestingContract.assignTokens(newAccountName, 'found.tmy', '1.000000 LEOS', 999, newAccountSigner);
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

            await eosioTokenContract.transfer('ops.tmy', newAccountName, '1.000000 LEOS', '', signer);

            try {
                await vestingContract.assignTokens(newAccountName, 'found.tmy', '1.000000 LEOS', 999, wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain("transaction declares authority '{\"actor\":\"" + newAccountName.toString() + "\",\"permission\":\"active\"}', but does not have signatures for it");
            }
        });

        test(
            'Unsuccessful assignment due to number of purchases',
            async () => {
                if (!process.env.CI) return; // Skip this test in local environment as it takes too long
                expect.assertions(2 + VestingContract.MAX_ALLOCATIONS);

                for (let i = 0; i < VestingContract.MAX_ALLOCATIONS; i++) {
                    await sleep(1000); // Wait to ensure don't get duplicate transaction error
                    const trx = await vestingContract.assignTokens(
                        'coinsale.tmy',
                        accountName,
                        '1.000000 LEOS',
                        999,
                        signer
                    );

                    expect(trx.processed.receipt.status).toBe('executed');
                }

                const allocations = await vestingContract.getAllocations(accountName);

                expect(allocations.length).toBe(VestingContract.MAX_ALLOCATIONS);

                try {
                    await sleep(1000); // Wait to ensure don't get duplicate transaction error
                    await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);
                } catch (e) {
                    expect(e.error.details[0].message).toContain('Too many purchases received on this account.');
                }
            },
            1.5 * VestingContract.MAX_ALLOCATIONS * 1000
        );

        test("successfully get account balance ", async () => {
            expect.assertions(4);

            const trx = await vestingContract.assignTokens('coinsale.tmy', accountName, '2.000000 LEOS', 999, signer);

            expect(trx.processed.receipt.status).toBe('executed');
            const balance = await vestingContract.getBalance(accountName);

            expect(balance).toBe(2);
            const trx2 = await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            expect(trx2.processed.receipt.status).toBe('executed');

            const balance2 = await vestingContract.getBalance(accountName);

            expect(balance2).toBe(3);
        })

        

        test("Successfully assign multiple tokens at once", async () => {
            expect.assertions(6 + 10 * 4);

            const sender = 'coinsale.tmy';
            const contract = 'vesting.tmy';
            const { user } = await createRandomID();
            const accountName2 = (await user.getAccountName()).toString()

            const assignTokensAction = {
                authorization: [
                    {
                        actor: sender.toString(),
                        permission: 'active',
                    },
                ],
                account: contract,
                name: 'assigntokens',
                data: {
                    sender,
                    holder: accountName,
                    amount: '2.000000 LEOS',
                    category: 999,
                },
            }
            const eosioTokenTransferData = {
                from: sender,
                to: contract,
                quantity: assignTokensAction.data.amount,
                memo: "Allocated vested funds"
            }

            const assignTokensAction2 = JSON.parse(JSON.stringify(assignTokensAction));

            assignTokensAction2.data.holder = accountName2;

            const actions = [assignTokensAction, assignTokensAction2];

            let vestedBalance = await vestingContract.getBalance(accountName);
            let vestedBalance2 = await vestingContract.getBalance(accountName2);
            const senderLeosBalance = await eosioTokenContract.getBalance(sender);

            expect(vestedBalance).toBe(0);
            expect(vestedBalance2).toBe(0);

            const trx = await transact(Name.from(contract), actions, signer);
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

            vestedBalance = await vestingContract.getBalance(accountName);
            vestedBalance2 = await vestingContract.getBalance(accountName2);
            const senderLeosBalanceAfter = await eosioTokenContract.getBalance(sender);

            expect(vestedBalance).toBe(2);
            expect(vestedBalance2).toBe(2);
            expect(senderLeosBalance - senderLeosBalanceAfter).toBe(4);
        })

        test("Successfully assign multiple tokens at once (msig transaction)", async () => {
            expect.assertions(7 + 3 + 10 * 4);

            const sender = 'coinsale.tmy';
            const contract = 'vesting.tmy';
            const { user } = await createRandomID();
            const accountName2 = (await user.getAccountName()).toString()

            const assignTokensAction = {
                authorization: [
                    {
                        actor: sender.toString(),
                        permission: 'active',
                    },
                ],
                account: contract,
                name: 'assigntokens',
                data: {
                    sender,
                    holder: accountName,
                    amount: '2.000000 LEOS',
                    category: 999,
                },
            }
            const eosioTokenTransferData = {
                from: sender,
                to: contract,
                quantity: assignTokensAction.data.amount,
                memo: "Allocated vested funds"
            }

            const assignTokensAction2 = JSON.parse(JSON.stringify(assignTokensAction));

            assignTokensAction2.data.holder = accountName2;

            const actions = [assignTokensAction, assignTokensAction2];

            let vestedBalance = await vestingContract.getBalance(accountName);
            let vestedBalance2 = await vestingContract.getBalance(accountName2);
            const senderLeosBalance = await eosioTokenContract.getBalance(sender);

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


            vestedBalance = await vestingContract.getBalance(accountName);
            vestedBalance2 = await vestingContract.getBalance(accountName2);
            const senderLeosBalanceAfter = await eosioTokenContract.getBalance(sender);

            expect(vestedBalance).toBe(2);
            expect(vestedBalance2).toBe(2);
            expect(senderLeosBalance - senderLeosBalanceAfter).toBe(4);
        })
    });

    describe('withdraw()', () => {
        test('Successful withdrawal after cliff period', async () => {
            expect.assertions(10);
            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            let allocations = await vestingContract.getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            await sleepUntil(addSeconds(vestingPeriod.cliffEnd, 1));
            const trx = await vestingContract.withdraw(accountName, accountSigner);

            expect(trx.processed.receipt.status).toBe('executed');
            expect(trx.processed.receipt.cpu_usage_us).toBeLessThan(500);
            expect(trx.processed.action_traces[0].inline_traces.length).toBe(1);
            const transferTrx = trx.processed.action_traces[0].inline_traces[0];

            expect(transferTrx.act.account).toBe('eosio.token');
            expect(transferTrx.act.name).toBe('transfer');
            expect(transferTrx.act.data.from).toBe('vesting.tmy');
            expect(transferTrx.act.data.to).toBe(accountName);
            const transferAmount = assetToAmount(transferTrx.act.data.quantity);

            expect(transferAmount).toBeLessThan(1.0);
            expect(transferAmount).toBeGreaterThan(0.5);

            allocations = await vestingContract.getAllocations(accountName);
            const allocatedAmount = assetToAmount(allocations[0].tokens_claimed);

            expect(allocatedAmount).toBe(transferAmount);
        });

        test('Successful withdrawal after vesting period', async () => {
            expect.assertions(2);
            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            let allocations = await vestingContract.getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            await sleepUntil(addSeconds(vestingPeriod.vestingEnd, 1));
            const trx = await vestingContract.withdraw(accountName, accountSigner);
            const transferTrx = trx.processed.action_traces[0].inline_traces[0];
            const transferAmount = assetToAmount(transferTrx.act.data.quantity);

            expect(transferAmount).toBe(1.0);

            allocations = await vestingContract.getAllocations(accountName);
            const allocatedAmount = assetToAmount(allocations[0].tokens_claimed);

            expect(allocatedAmount).toBe(transferAmount);
        });

        test('Successful withdrawal with TGE unlock', async () => {
            expect.assertions(8);
            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 998, signer);

            let allocations = await vestingContract.getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            await sleepUntil(addSeconds(vestingPeriod.vestingStart, 0));
            const trx = await vestingContract.withdraw(accountName, accountSigner);
            const transferTrx = trx.processed.action_traces[0].inline_traces[0];
            const transferAmount = assetToAmount(transferTrx.act.data.quantity);

            expect(transferAmount).toBeGreaterThan(0.5);
            expect(transferAmount).toBeLessThan(1.0);

            allocations = await vestingContract.getAllocations(accountName);
            const allocatedAmount = assetToAmount(allocations[0].tokens_claimed);

            expect(allocatedAmount).toBe(transferAmount);

            await sleep(1000);
            const trx2 = await vestingContract.withdraw(accountName, accountSigner);
            const transferTrx2 = trx2.processed.action_traces[0].inline_traces[0];
            const transferAmount2 = assetToAmount(transferTrx2.act.data.quantity);

            expect(transferAmount2).toBeLessThan(transferAmount);
            expect(transferAmount2).toBeLessThan(1.0 - transferAmount);

            await sleepUntil(addSeconds(vestingPeriod.vestingEnd, 0));
            const trx3 = await vestingContract.withdraw(accountName, accountSigner);
            const transferTrx3 = trx3.processed.action_traces[0].inline_traces[0];
            const transferAmount3 = assetToAmount(transferTrx3.act.data.quantity);

            expect(transferAmount + transferAmount2 + transferAmount3).toBeCloseTo(1.0, 6);

            const allocations2 = await vestingContract.getAllocations(accountName);

            expect(assetToAmount(allocations2[0].tokens_claimed)).toBe(1.0);

            await sleep(1000);
            const trx4 = await vestingContract.withdraw(accountName, accountSigner);

            expect(trx4.processed.action_traces[0].inline_traces.length).toBe(0);
        });

        test('Cannot withdraw more after all already withdrawn', async () => {
            expect.assertions(2);
            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            let allocations = await vestingContract.getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            await sleepUntil(addSeconds(vestingPeriod.vestingEnd, 1));
            await vestingContract.withdraw(accountName, accountSigner);
            await sleep(1000); // Wait to ensure don't get duplicate transaction error
            const trx = await vestingContract.withdraw(accountName, accountSigner);

            expect(trx.processed.action_traces[0].inline_traces.length).toBe(0);

            allocations = await vestingContract.getAllocations(accountName);
            const allocatedAmount = assetToAmount(allocations[0].tokens_claimed);

            expect(allocatedAmount).toBe(1.0);
        });

        test('Successful withdrawal during and after vesting period', async () => {
            expect.assertions(5);
            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            let allocations = await vestingContract.getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            await sleepUntil(addSeconds(vestingPeriod.cliffEnd, 1));
            const trx = await vestingContract.withdraw(accountName, accountSigner);
            const transferTrx = trx.processed.action_traces[0].inline_traces[0];
            const transferAmount = assetToAmount(transferTrx.act.data.quantity);

            expect(transferAmount).toBeLessThan(1.0);
            expect(transferAmount).toBeGreaterThan(0.5);

            allocations = await vestingContract.getAllocations(accountName);
            const allocatedAmount = assetToAmount(allocations[0].tokens_claimed);

            expect(allocatedAmount).toBe(transferAmount);

            // Then wait till end of vesting period
            await sleepUntil(addSeconds(vestingPeriod.vestingEnd, 1));
            const trx2 = await vestingContract.withdraw(accountName, accountSigner);
            const transferTrx2 = trx2.processed.action_traces[0].inline_traces[0];
            const transferAmount2 = assetToAmount(transferTrx2.act.data.quantity);

            expect(transferAmount2).toBeCloseTo(1.0 - transferAmount, 6);

            allocations = await vestingContract.getAllocations(accountName);
            const allocatedAmount2 = assetToAmount(allocations[0].tokens_claimed);

            expect(allocatedAmount2).toBe(1.0);
        });

        test('Successful 0.0 LEOS withdrawal before cliff end', async () => {
            expect.assertions(2);
            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            let allocations = await vestingContract.getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            await sleepUntil(subtractSeconds(vestingPeriod.cliffEnd, 3));
            const trx = await vestingContract.withdraw(accountName, accountSigner);

            expect(trx.processed.action_traces[0].inline_traces.length).toBe(0);

            allocations = await vestingContract.getAllocations(accountName);
            const allocatedAmount = assetToAmount(allocations[0].tokens_claimed);

            expect(allocatedAmount).toBe(0.0);
        });

        test('Successful withdrawal with 2 different allocations of same category', async () => {
            expect.assertions(9);

            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);
            await sleep(1000);
            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            const allocations = await vestingContract.getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            // 1st withdrawal after allocation cliff end
            await sleepUntil(addSeconds(vestingPeriod.cliffEnd, 1));
            const trx = await vestingContract.withdraw(accountName, accountSigner);

            const transferAmount = assetToAmount(trx.processed.action_traces[0].inline_traces[0].act.data.quantity);
            const allocations1 = await vestingContract.getAllocations(accountName);

            expect(assetToAmount(allocations1[0].tokens_claimed)).toBe(transferAmount / 2);
            expect(assetToAmount(allocations1[1].tokens_claimed)).toBe(transferAmount / 2);

            // 2nd withdrawal after a few more seconds
            await sleep(2000);
            const trx2 = await vestingContract.withdraw(accountName, accountSigner);
            const transferAmount2 = assetToAmount(trx2.processed.action_traces[0].inline_traces[0].act.data.quantity);
            const allocations2 = await vestingContract.getAllocations(accountName);

            expect(assetToAmount(allocations2[0].tokens_claimed)).toBe(assetToAmount(allocations2[1].tokens_claimed));
            expect(assetToAmount(allocations2[0].tokens_claimed)).toBeGreaterThan(transferAmount / 2);
            expect(assetToAmount(allocations2[0].tokens_claimed)).toBeLessThan(1.0);
            expect(transferAmount2).toBeCloseTo(
                assetToAmount(allocations2[0].tokens_claimed) +
                assetToAmount(allocations2[1].tokens_claimed) -
                transferAmount, 6
            );

            // 3rd withdrawal after allocation vesting end
            await sleepUntil(addSeconds(vestingPeriod.vestingEnd, 1));
            const trx3 = await vestingContract.withdraw(accountName, accountSigner);
            const transferAmount3 = assetToAmount(trx3.processed.action_traces[0].inline_traces[0].act.data.quantity);
            const allocations3 = await vestingContract.getAllocations(accountName);

            expect(assetToAmount(allocations3[0].tokens_claimed)).toBe(1.0);
            expect(assetToAmount(allocations3[1].tokens_claimed)).toBe(1.0);

            expect(transferAmount + transferAmount2 + transferAmount3).toBeCloseTo(2.0, 6);
        });

        test('Successful withdrawal with 2 different allocations of different categories', async () => {
            expect.assertions(4);

            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);
            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 997, signer);

            const allocations = await vestingContract.getAllocations(accountName);
            const vestingPeriod = VestingContract.calculateVestingPeriod(settings, allocations[0]);

            // 1st withdrawal after 1st allocation vesting end
            await sleepUntil(addSeconds(vestingPeriod.vestingEnd, 1));
            await vestingContract.withdraw(accountName, accountSigner);

            const allocations1 = await vestingContract.getAllocations(accountName);

            expect(assetToAmount(allocations1[0].tokens_claimed)).toBe(1.0);
            expect(assetToAmount(allocations1[1].tokens_claimed)).toBe(0.0);

            // Withdraw again
            await sleep(1000); // Wait to ensure don't get duplicate transaction error
            await vestingContract.withdraw(accountName, accountSigner);
            const allocations2 = await vestingContract.getAllocations(accountName);

            expect(assetToAmount(allocations2[0].tokens_claimed)).toBe(1.0);
            expect(assetToAmount(allocations2[1].tokens_claimed)).toBe(0.0);
        });

        test('Unsuccessful when launch has not started', async () => {
            expect.assertions(1);
            const settings = await vestingContract.getSettings();

            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            await sleepUntil(subtractSeconds(new Date(settings.launch_date), 3));

            try {
                await vestingContract.withdraw(accountName, accountSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain('Launch date not yet reached');
            }
        });
    });

    describe('migratealloc()', () => {
        test('Successful migrates tokens to new category and higher amount', async () => {
            expect.assertions(7);

            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            const allocations = await vestingContract.getAllocations(accountName);
            const oldAllocation = allocations[0];

            const trx = await vestingContract.migrateAllocation('coinsale.tmy', accountName, oldAllocation.id,
                oldAllocation.tokens_allocated, "2.000000 LEOS",
                oldAllocation.vesting_category_type, 998,
                signer);

            const allocations1 = await vestingContract.getAllocations(accountName);
            const newAllocation = allocations1[0];

            expect(newAllocation.tokens_allocated).toBe('2.000000 LEOS');
            expect(newAllocation.vesting_category_type).toBe(998);

            const transferTrx = trx.processed.action_traces[0].inline_traces[1];

            expect(transferTrx.act.account).toBe('eosio.token');
            expect(transferTrx.act.name).toBe('transfer');
            expect(transferTrx.act.data.from).toBe('coinsale.tmy');
            expect(transferTrx.act.data.to).toBe('vesting.tmy');
            expect(transferTrx.act.data.quantity).toBe('1.000000 LEOS');
        });

        test('Successful migrates tokens to new category and lower amount', async () => {
            expect.assertions(7);
            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            const allocations = await vestingContract.getAllocations(accountName);
            const oldAllocation = allocations[0];

            const trx = await vestingContract.migrateAllocation('coinsale.tmy', accountName, oldAllocation.id,
                oldAllocation.tokens_allocated, "0.500000 LEOS",
                oldAllocation.vesting_category_type, 998,
                signer);

            const allocations1 = await vestingContract.getAllocations(accountName);
            const newAllocation = allocations1[0];

            expect(newAllocation.tokens_allocated).toBe('0.500000 LEOS');
            expect(newAllocation.vesting_category_type).toBe(998);

            const transferTrx = trx.processed.action_traces[0].inline_traces[1];

            expect(transferTrx.act.account).toBe('eosio.token');
            expect(transferTrx.act.name).toBe('transfer');
            expect(transferTrx.act.data.to).toBe('coinsale.tmy');
            expect(transferTrx.act.data.from).toBe('vesting.tmy');
            expect(transferTrx.act.data.quantity).toBe('0.500000 LEOS');
        });

        test('Successfully withdraws after migration', async () => {
            expect.assertions(1);

            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            const allocations = await vestingContract.getAllocations(accountName);
            const oldAllocation = allocations[0];

            await vestingContract.migrateAllocation('coinsale.tmy', accountName, oldAllocation.id,
                oldAllocation.tokens_allocated, "2.000000 LEOS",
                oldAllocation.vesting_category_type, 998,
                signer);

            const allocations2 = await vestingContract.getAllocations(accountName);
            const vestingPeriod2 = VestingContract.calculateVestingPeriod(settings, allocations2[0]);

            await sleepUntil(vestingPeriod2.vestingEnd);
            const trx = await vestingContract.withdraw(accountName, accountSigner);
            const transferTrx = trx.processed.action_traces[0].inline_traces[0];
            const transferAmount = assetToAmount(transferTrx.act.data.quantity);

            expect(transferAmount).toBe(2.0);
        });

        test("Unsuccessful if old category does not match", async () => {
            expect.assertions(1);

            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            const allocations = await vestingContract.getAllocations(accountName);
            const oldAllocation = allocations[0];

            try {
                await vestingContract.migrateAllocation('coinsale.tmy', accountName, oldAllocation.id,
                    oldAllocation.tokens_allocated, "2.000000 LEOS",
                    998, 998,
                    signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Old category does not match existing allocation");
            }
        });

        test("Unsuccessful if old amount does not match", async () => {
            expect.assertions(1);

            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            const allocations = await vestingContract.getAllocations(accountName);
            const oldAllocation = allocations[0];

            try {
                await vestingContract.migrateAllocation('coinsale.tmy', accountName, oldAllocation.id,
                    "2.000000 LEOS", "2.000000 LEOS",
                    oldAllocation.vesting_category_type, 998,
                    signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain("Old amount does not match existing allocation");
            }
        });

        test("Successful if some tokens already withdrawn", async () => {
            expect.assertions(3);

            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            const allocations = await vestingContract.getAllocations(accountName);
            const oldAllocation = allocations[0];

            const allocations2 = await vestingContract.getAllocations(accountName);
            const vestingPeriod2 = VestingContract.calculateVestingPeriod(settings, allocations2[0]);

            await sleepUntil(vestingPeriod2.vestingEnd);
            await vestingContract.withdraw(accountName, accountSigner);

            await vestingContract.migrateAllocation('coinsale.tmy', accountName, oldAllocation.id,
                oldAllocation.tokens_allocated, "2.000000 LEOS",
                oldAllocation.vesting_category_type, 998,
                signer);

            const allocations3 = await vestingContract.getAllocations(accountName);
            const newAllocation = allocations3[0];

            expect(newAllocation.tokens_claimed).toBe('1.000000 LEOS');
            expect(newAllocation.tokens_allocated).toBe('2.000000 LEOS');

            await sleep(1000);
            const trx = await vestingContract.withdraw(accountName, accountSigner);
            const transferTrx = trx.processed.action_traces[0].inline_traces[0];
            const transferAmount = assetToAmount(transferTrx.act.data.quantity);

            expect(transferAmount).toBe(1.0);
        });

        test("Unsuccessful new amount is less than already withdrawn", async () => {
            expect.assertions(1);

            await vestingContract.assignTokens('coinsale.tmy', accountName, '1.000000 LEOS', 999, signer);

            const allocations = await vestingContract.getAllocations(accountName);
            const oldAllocation = allocations[0];

            const allocations2 = await vestingContract.getAllocations(accountName);
            const vestingPeriod2 = VestingContract.calculateVestingPeriod(settings, allocations2[0]);

            await sleepUntil(vestingPeriod2.vestingEnd);
            await vestingContract.withdraw(accountName, accountSigner);

            try {
                await vestingContract.migrateAllocation('coinsale.tmy', accountName, oldAllocation.id,
                    oldAllocation.tokens_allocated, "0.500000 LEOS",
                    oldAllocation.vesting_category_type, 998,
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
