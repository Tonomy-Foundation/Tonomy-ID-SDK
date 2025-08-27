/* eslint-disable prettier/prettier */
import {
    createKeyManagerSigner,
    createSigner,
    getTonomyOperationsKey,
    Signer,
    getTokenContract,
} from '../../../../src/sdk/services/blockchain';
import { KeyManagerLevel } from '../../../../src/sdk/index';
import { jest } from '@jest/globals';
import { createRandomID } from '../../../helpers/user';
import { PrivateKey } from '@wharfkit/antelope';
import { sleep } from '../../../../src/sdk/util';

const tokenContract = getTokenContract();
const signer = createSigner(getTonomyOperationsKey());

describe('EosioTokenContract Tests', () => {
    jest.setTimeout(60000);

    let userAccount: string;
    let userSigner: Signer;
    let receiverAccount: string;
    let SYMBOL: string;
    let MAX_SUPPLY: string;
    let INITIAL_ISSUE: string;
    let TRANSFER_AMOUNT: string;
    
    // Generate unique symbol for each test to avoid "token already exists" errors
    const generateUniqueSymbol = (length = 6): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';

        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    };

    const getTestAssets = (symbol: string) => ({
        MAX_SUPPLY: `1000000.0000 ${symbol}`,
        INITIAL_ISSUE: `100.0000 ${symbol}`,
        TRANSFER_AMOUNT: `10.0000 ${symbol}`
    });

    beforeEach(async () => {
        // Generate unique symbol and test assets for each test
        SYMBOL = generateUniqueSymbol();
        const assets = getTestAssets(SYMBOL);

        MAX_SUPPLY = assets.MAX_SUPPLY;
        INITIAL_ISSUE = assets.INITIAL_ISSUE;
        TRANSFER_AMOUNT = assets.TRANSFER_AMOUNT;

        const [
            {user},
            {user: receiver}
        ] = await Promise.all([
            createRandomID(),
            createRandomID()
        ]);

        userAccount = (await user.getAccountName()).toString();
        userSigner = createKeyManagerSigner(user.keyManager, KeyManagerLevel.ACTIVE);

        receiverAccount = (await receiver.getAccountName()).toString();
    });

    describe('create()', () => {
        test('Successfully create a new token with valid parameters', async () => {
            const trx = await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            expect(trx.processed.receipt.status).toBe('executed');

            // Verify token stats were created (we can check this by trying to issue tokens)
            const issueTrx = await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);

            expect(issueTrx.processed.receipt.status).toBe('executed');
        });

        test('Fails to create token with invalid maximum supply (negative)', async () => {
            expect.assertions(1);

            try {
                await tokenContract.create('eosio.token', `-1000.0000 ${SYMBOL}`, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('max-supply must be positive');
            }
        });

        test('Fails to create token with invalid maximum supply (zero)', async () => {
            expect.assertions(1);

            try {
                await tokenContract.create('eosio.token', `0.0000 ${SYMBOL}`, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('max-supply must be positive');
            }
        });

        test('Fails to create token with invalid symbol', async () => {
            expect.assertions(1);

            try {
                await tokenContract.create('eosio.token', `1000.0000 TES34`, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('invalid supply');
            }
        });

        test('Fails to create token that already exists', async () => {
            expect.assertions(1);

            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            // Try to create it again
            try {
                await sleep(1000)
                await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('token with symbol already exists');
            }
        });

        test('Fails to create token with unauthorized signer', async () => {
            expect.assertions(1);
            const wrongSigner = createSigner(PrivateKey.generate("K1"));

            try {
                await tokenContract.create('eosio.token', MAX_SUPPLY, wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain('transaction declares authority');
            }
        });
    });
    
    describe('issue()', () => {
        test('Successfully issue tokens to issuer account', async () => {
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
             
            const trx = await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);

            expect(trx.processed.receipt.status).toBe('executed');

            // Verify the balance was updated
            const balance = await tokenContract.getBalanceDecimal('eosio.token', SYMBOL);

            expect(balance.toNumber()).toBe(100);
        });

        test('Successfully issue tokens multiple times', async () => {
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            
            // Issue first batch
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'First issue', signer);
            
            // Issue second batch
            const secondIssue = `50.0000 ${SYMBOL}`;

            await tokenContract.issue('eosio.token', secondIssue, 'Second issue', signer);

            // Verify total balance
            const balance = await tokenContract.getBalanceDecimal('eosio.token', SYMBOL);

            expect(balance.toNumber()).toBe(150);
        });

        test('Fails to issue tokens to non-issuer account', async () => {
            expect.assertions(1);
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.issue(userAccount, INITIAL_ISSUE, 'Invalid issue', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('tokens can only be issued to issuer account');
            }
        });

        test('Fails to issue tokens exceeding maximum supply', async () => {
            expect.assertions(1);
            const excessiveAmount = `1000001.0000 ${SYMBOL}`;
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.issue('eosio.token', excessiveAmount, 'Excessive issue', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('quantity exceeds available supply');
            }
        });

        test('Fails to issue tokens with invalid quantity (negative)', async () => {
            expect.assertions(1);
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.issue('eosio.token', `-10.0000 ${SYMBOL}`, 'Invalid issue', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('must be positive quantity');
            }
        });

        test('Fails to issue tokens with invalid quantity (zero)', async () => {
            expect.assertions(1);
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.issue('eosio.token', `0.0000 ${SYMBOL}`, 'Invalid issue', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('must be positive quantity');
            }
        });

        test('Fails to issue tokens with wrong symbol', async () => {
            expect.assertions(1);
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.issue('eosio.token', '100.0000 WRONG', 'Invalid issue', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('token with symbol does not exist');
            }
        });

        test('Fails to issue tokens with wrong precision', async () => {
            expect.assertions(1);
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.issue('eosio.token', `100.00 ${SYMBOL}`, 'Invalid issue', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('symbol precision mismatch');
            }
        });

        test('Fails to issue tokens with unauthorized signer', async () => {
            expect.assertions(1);
            const wrongSigner = createSigner(PrivateKey.generate("K1"));
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Unauthorized issue', wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain('transaction declares authority');
            }
        });

        test('Fails to issue tokens with memo exceeding 256 bytes', async () => {
            expect.assertions(1);
            const longMemo = 'a'.repeat(257);
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.issue('eosio.token', INITIAL_ISSUE, longMemo, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('memo has more than 256 bytes');
            }
        });
    });

    describe('transfer()', () => {
        test('Successfully transfer tokens between accounts', async () => {
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);
            
            const initialSenderBalance = await tokenContract.getBalanceDecimal('eosio.token', SYMBOL);
            const initialReceiverBalance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);

            const trx = await tokenContract.transfer(
                'eosio.token', 
                userAccount, 
                TRANSFER_AMOUNT, 
                'Test transfer', 
                signer
            );

            expect(trx.processed.receipt.status).toBe('executed');

            // Verify balances updated correctly
            const finalSenderBalance = await tokenContract.getBalanceDecimal('eosio.token', SYMBOL);
            const finalReceiverBalance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);

            expect(finalSenderBalance.toNumber()).toBe(initialSenderBalance.minus(10).toNumber());
            expect(finalReceiverBalance.toNumber()).toBe(initialReceiverBalance.plus(10).toNumber());
        });

        test('Successfully transfer all tokens', async () => {
            const allTokens = `100.0000 ${SYMBOL}`;
            
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);
            
            const trx = await tokenContract.transfer(
                'eosio.token', 
                userAccount, 
                allTokens, 
                'Transfer all', 
                signer
            );

            expect(trx.processed.receipt.status).toBe('executed');

            // Verify balances
            const senderBalance = await tokenContract.getBalanceDecimal('eosio.token', SYMBOL);
            const receiverBalance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);

            expect(senderBalance.toNumber()).toBe(0);
            expect(receiverBalance.toNumber()).toBe(100);
        });

        test('Fails to transfer tokens to self', async () => {
            expect.assertions(1);
            
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);

            try {
                await tokenContract.transfer(
                    'eosio.token', 
                    'eosio.token', 
                    TRANSFER_AMOUNT, 
                    'Self transfer', 
                    signer
                );
            } catch (e) {
                expect(e.error.details[0].message).toContain('cannot transfer to self');
            }
        });

        test('Fails to transfer tokens with insufficient balance', async () => {
            expect.assertions(1);
            const excessiveAmount = `1000.0000 ${SYMBOL}`;
            
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);

            try {
                await tokenContract.transfer(
                    'eosio.token', 
                    userAccount, 
                    excessiveAmount, 
                    'Excessive transfer', 
                    signer
                );
            } catch (e) {
                expect(e.error.details[0].message).toContain('overdrawn balance');
            }
        });

        test('Fails to transfer tokens to non-existent account', async () => {
            expect.assertions(1);
            const nonExistentAccount = 'nonexistent1';
            
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);

            try {
                await tokenContract.transfer(
                    'eosio.token', 
                    nonExistentAccount, 
                    TRANSFER_AMOUNT, 
                    'Transfer to non-existent', 
                    signer
                );
            } catch (e) {
                expect(e.error.details[0].message).toContain('to account does not exist');
            }
        });

        test('Fails to transfer tokens with invalid quantity (negative)', async () => {
            expect.assertions(1);
            
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);

            try {
                await tokenContract.transfer(
                    'eosio.token', 
                    userAccount, 
                    `-10.0000 ${SYMBOL}`, 
                    'Negative transfer', 
                    signer
                );
            } catch (e) {
                expect(e.error.details[0].message).toContain('must be positive quantity');
            }
        });

        test('Fails to transfer tokens with invalid quantity (zero)', async () => {
            expect.assertions(1);
            
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);

            try {
                await tokenContract.transfer(
                    'eosio.token', 
                    userAccount, 
                    `0.0000 ${SYMBOL}`, 
                    'Zero transfer', 
                    signer
                );
            } catch (e) {
                expect(e.error.details[0].message).toContain('must be positive quantity');
            }
        });

        test('Fails to transfer tokens with wrong symbol', async () => {
            expect.assertions(1);
            
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);

            try {
                await tokenContract.transfer(
                    'eosio.token', 
                    userAccount, 
                    '10.0000 WRONG', 
                    'Wrong symbol transfer', 
                    signer
                );
            } catch (e) {
                expect(e.error.details[0].message).toContain('token with symbol does not exist');
            }
        });

        test('Fails to transfer tokens with wrong precision', async () => {
            expect.assertions(1);
            
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);

            try {
                await tokenContract.transfer(
                    'eosio.token', 
                    userAccount, 
                    `10.00 ${SYMBOL}`, 
                    'Wrong precision transfer', 
                    signer
                );
            } catch (e) {
                expect(e.error.details[0].message).toContain('symbol precision mismatch');
            }
        });

        test('Fails to transfer tokens with unauthorized signer', async () => {
            expect.assertions(1);
            const wrongSigner = createSigner(PrivateKey.generate("K1"));
            
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);

            try {
                await tokenContract.transfer(
                    'eosio.token', 
                    userAccount, 
                    TRANSFER_AMOUNT, 
                    'Unauthorized transfer', 
                    wrongSigner
                );
            } catch (e) {
                expect(e.error.details[0].message).toContain('transaction declares authority');
            }
        });

        test('Fails to transfer tokens without authorization from sender', async () => {
            expect.assertions(1);
            
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);

            try {
                await tokenContract.transfer(
                    'eosio.token', 
                    userAccount, 
                    TRANSFER_AMOUNT, 
                    'No auth transfer', 
                    userSigner
                );
            } catch (e) {
                expect(e.error.details[0].message).toContain('transaction declares authority');
            }
        });

        test('Fails to transfer tokens with memo exceeding 256 bytes', async () => {
            expect.assertions(1);
            const longMemo = 'a'.repeat(257);
            
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);

            try {
                await tokenContract.transfer(
                    'eosio.token', 
                    userAccount, 
                    TRANSFER_AMOUNT, 
                    longMemo, 
                    signer
                );
            } catch (e) {
                expect(e.error.details[0].message).toContain('memo has more than 256 bytes');
            }
        });

        test('Multiple transfers work correctly', async () => {
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);
            
            // First transfer from eosio.token to user
            await tokenContract.transfer(
                'eosio.token', 
                userAccount, 
                `30.0000 ${SYMBOL}`, 
                'First transfer', 
                signer
            );

            // Transfer from user to receiver
            await tokenContract.transfer(
                userAccount, 
                receiverAccount, 
                `20.0000 ${SYMBOL}`, 
                'Second transfer', 
                userSigner
            );

            // Verify final balances
            const eosioTokenBalance = await tokenContract.getBalanceDecimal('eosio.token', SYMBOL);
            const userBalance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);
            const receiverBalance = await tokenContract.getBalanceDecimal(receiverAccount, SYMBOL);

            expect(eosioTokenBalance.toNumber()).toBe(70); // 100 - 30
            expect(userBalance.toNumber()).toBe(10);   // 30 - 20
            expect(receiverBalance.toNumber()).toBe(20); // 0 + 20
        });

        test('Complete token lifecycle with all operations', async () => {
            // Create token
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            
            // Regular issue tokens to issuer
            await tokenContract.issue('eosio.token', `500.0000 ${SYMBOL}`, 'Initial issue', signer);
            
            // Bridge issue additional tokens to different accounts (bypassing issuer restriction)
            await tokenContract.bridgeIssue(userAccount, `200.0000 ${SYMBOL}`, 'Bridge issue to user', signer);
            await tokenContract.bridgeIssue(receiverAccount, `100.0000 ${SYMBOL}`, 'Bridge issue to receiver', signer);
            
            // Transfer between accounts
            await tokenContract.transfer(
                'eosio.token', 
                userAccount, 
                `50.0000 ${SYMBOL}`, 
                'Transfer to user', 
                signer
            );
            
            // User transfers to receiver
            await tokenContract.transfer(
                userAccount,
                receiverAccount,
                `25.0000 ${SYMBOL}`,
                'User to receiver',
                userSigner
            );
            
            // Bridge retire some tokens (can retire from any account)
            await tokenContract.bridgeRetire(userAccount, `25.0000 ${SYMBOL}`, 'Bridge retire from user', signer);
            
            // Regular retire from issuer
            await tokenContract.retire(`50.0000 ${SYMBOL}`, 'Regular retire', signer);
            
            // Verify final balances
            const eosioTokenBalance = await tokenContract.getBalanceDecimal('eosio.token', SYMBOL);
            const userBalance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);
            const receiverBalance = await tokenContract.getBalanceDecimal(receiverAccount, SYMBOL);
            
            expect(eosioTokenBalance.toNumber()).toBe(400); // 500 - 50 (transfer) - 50 (retire)
            expect(userBalance.toNumber()).toBe(200);   // 200 (bridge) + 50 (transfer) - 25 (to receiver) - 25 (bridge retire)
            expect(receiverBalance.toNumber()).toBe(125); // 100 (bridge) + 25 (from user)
            
            // Total should be: 400 + 200 + 125 = 725
            // Original issue: 500 + 200 + 100 = 800
            // Retired: 50 (regular) + 25 (bridge) = 75
            // Expected total: 800 - 75 = 725 ✓
            const total = eosioTokenBalance.plus(userBalance).plus(receiverBalance);

            expect(total.toNumber()).toBe(725);
        });
    });

    describe('retire()', () => {
        test('Successfully retire tokens', async () => {
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);
            
            const retireAmount = `50.0000 ${SYMBOL}`;
            const initialBalance = await tokenContract.getBalanceDecimal('eosio.token', SYMBOL);

            const trx = await tokenContract.retire(retireAmount, 'Retire tokens', signer);

            expect(trx.processed.receipt.status).toBe('executed');

            // Verify balance decreased
            const finalBalance = await tokenContract.getBalanceDecimal('eosio.token', SYMBOL);

            expect(finalBalance.toNumber()).toBe(initialBalance.minus(50).toNumber());
        });

        test('Fails to retire more tokens than available supply', async () => {
            expect.assertions(1);
            
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);
            
            const excessiveAmount = `200.0000 ${SYMBOL}`;

            try {
                await tokenContract.retire(excessiveAmount, 'Excessive retire', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('quantity exceeds available supply');
            }
        });

        test('Fails to retire tokens with unauthorized signer', async () => {
            expect.assertions(1);
            const retireAmount = `50.0000 ${SYMBOL}`;
            const wrongSigner = createSigner(PrivateKey.generate("K1"));
            
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);

            try {
                await tokenContract.retire(retireAmount, 'Unauthorized retire', wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain('transaction declares authority');
            }
        });
    });

    describe('getBalance()', () => {
        test('Returns correct balance for account with tokens', async () => {
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);
            
            const balance = await tokenContract.getBalanceDecimal('eosio.token', SYMBOL);

            expect(balance.toNumber()).toBe(100);
        });

        test('Returns zero balance for account without tokens', async () => {
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);
            
            const balance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);

            expect(balance.toNumber()).toBe(0);
        });

        test('Returns updated balance after transfer', async () => {
            // Create token and issue to issuer account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);
            
            // Transfer some tokens
            await tokenContract.transfer(
                'eosio.token', 
                userAccount, 
                TRANSFER_AMOUNT, 
                'Test transfer', 
                signer
            );

            const eosioTokenBalance = await tokenContract.getBalanceDecimal('eosio.token', SYMBOL);
            const userBalance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);

            expect(eosioTokenBalance.toNumber()).toBe(90);
            expect(userBalance.toNumber()).toBe(10);
        });
    });

    describe('bridgeIssue()', () => {
        test('Successfully bridge issue tokens to any account', async () => {
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            
            const bridgeIssueAmount = `100.0000 ${SYMBOL}`;
            const trx = await tokenContract.bridgeIssue(userAccount, bridgeIssueAmount, 'Bridge issue', signer);

            expect(trx.processed.receipt.status).toBe('executed');

            // Verify the balance was updated
            const balance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);

            expect(balance.toNumber()).toBe(100);
        });

        test('Successfully bridge issue tokens to multiple accounts', async () => {
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            
            const bridgeIssueAmount = `50.0000 ${SYMBOL}`;
            
            // Issue to first account
            await tokenContract.bridgeIssue(userAccount, bridgeIssueAmount, 'Bridge issue to user', signer);
            
            // Issue to second account
            await tokenContract.bridgeIssue(receiverAccount, bridgeIssueAmount, 'Bridge issue to receiver', signer);

            // Verify balances
            const userBalance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);
            const receiverBalance = await tokenContract.getBalanceDecimal(receiverAccount, SYMBOL);
            
            expect(userBalance.toNumber()).toBe(50);
            expect(receiverBalance.toNumber()).toBe(50);
        });

        test('Successfully bridge issue tokens exceeding regular maximum supply', async () => {
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            
            // Bridge issue can exceed max supply unlike regular issue
            const excessiveAmount = `2000000.0000 ${SYMBOL}`;
            const trx = await tokenContract.bridgeIssue(userAccount, excessiveAmount, 'Excessive bridge issue', signer);

            expect(trx.processed.receipt.status).toBe('executed');

            // Verify the balance
            const balance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);

            expect(balance.toNumber()).toBe(2000000);
        });

        test('Bridge issue with precision handling', async () => {
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.bridgeIssue(userAccount, `100.0001 ${SYMBOL}`, 'Precise bridge issue', signer);
            
            const balance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);

            expect(balance.toString()).toBe('100.0001');
        });

        test('Fails to bridge issue tokens to non-existent account', async () => {
            expect.assertions(1);
            const nonExistentAccount = 'nonexistent1';
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.bridgeIssue(nonExistentAccount, INITIAL_ISSUE, 'Invalid bridge issue', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('to account does not exist');
            }
        });

        test('Fails to bridge issue tokens with invalid quantity (negative)', async () => {
            expect.assertions(1);
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.bridgeIssue(userAccount, `-10.0000 ${SYMBOL}`, 'Invalid bridge issue', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('must be positive quantity');
            }
        });

        test('Fails to bridge issue tokens with invalid quantity (zero)', async () => {
            expect.assertions(1);
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.bridgeIssue(userAccount, `0.0000 ${SYMBOL}`, 'Invalid bridge issue', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('must be positive quantity');
            }
        });

        test('Fails to bridge issue tokens with wrong symbol', async () => {
            expect.assertions(1);
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.bridgeIssue(userAccount, '100.0000 WRONG', 'Invalid bridge issue', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('token with symbol does not exist');
            }
        });

        test('Fails to bridge issue tokens with wrong precision', async () => {
            expect.assertions(1);
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.bridgeIssue(userAccount, `100.00 ${SYMBOL}`, 'Invalid bridge issue', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('symbol precision mismatch');
            }
        });

        test('Fails to bridge issue tokens with unauthorized signer', async () => {
            expect.assertions(1);
            const wrongSigner = createSigner(PrivateKey.generate("K1"));
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.bridgeIssue(userAccount, INITIAL_ISSUE, 'Unauthorized bridge issue', wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain('transaction declares authority');
            }
        });

        test('Fails to bridge issue tokens with memo exceeding 256 bytes', async () => {
            expect.assertions(1);
            const longMemo = 'a'.repeat(257);
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.bridgeIssue(userAccount, INITIAL_ISSUE, longMemo, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('memo has more than 256 bytes');
            }
        });
    });

    describe('bridgeRetire()', () => {
        test('Successfully bridge retire tokens from any account', async () => {
            // Create token and bridge issue to account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.bridgeIssue(userAccount, INITIAL_ISSUE, 'Bridge issue', signer);
            
            const retireAmount = `50.0000 ${SYMBOL}`;
            const initialBalance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);

            const trx = await tokenContract.bridgeRetire(userAccount, retireAmount, 'Bridge retire', signer);

            expect(trx.processed.receipt.status).toBe('executed');

            // Verify balance decreased
            const finalBalance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);

            expect(finalBalance.toNumber()).toBe(initialBalance.minus(50).toNumber());
        });

        test('Successfully bridge retire all tokens from account', async () => {
            // Create token and bridge issue to account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.bridgeIssue(userAccount, INITIAL_ISSUE, 'Bridge issue', signer);
            
            const trx = await tokenContract.bridgeRetire(userAccount, INITIAL_ISSUE, 'Bridge retire all', signer);

            expect(trx.processed.receipt.status).toBe('executed');

            // Verify balance is zero
            const finalBalance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);

            expect(finalBalance.toNumber()).toBe(0);
        });

        test('Successfully bridge retire from multiple accounts', async () => {
            // Create token and bridge issue to multiple accounts
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.bridgeIssue(userAccount, INITIAL_ISSUE, 'Bridge issue to user', signer);
            await tokenContract.bridgeIssue(receiverAccount, INITIAL_ISSUE, 'Bridge issue to receiver', signer);
            
            const retireAmount = `30.0000 ${SYMBOL}`;
            
            // Retire from both accounts
            await tokenContract.bridgeRetire(userAccount, retireAmount, 'Bridge retire from user', signer);
            await tokenContract.bridgeRetire(receiverAccount, retireAmount, 'Bridge retire from receiver', signer);

            // Verify balances
            const userBalance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);
            const receiverBalance = await tokenContract.getBalanceDecimal(receiverAccount, SYMBOL);
            
            expect(userBalance.toNumber()).toBe(70);
            expect(receiverBalance.toNumber()).toBe(70);
        });

        test('Bridge retire with precision handling', async () => {
            // Create token and bridge issue to account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.bridgeIssue(userAccount, `100.0001 ${SYMBOL}`, 'Bridge issue', signer);
            
            await tokenContract.bridgeRetire(userAccount, `50.0001 ${SYMBOL}`, 'Precise bridge retire', signer);
            
            const finalBalance = await tokenContract.getBalanceDecimal(userAccount, SYMBOL);

            expect(finalBalance.toString()).toBe('50');
        });

        test('Fails to bridge retire tokens from non-existent account', async () => {
            expect.assertions(1);
            const nonExistentAccount = 'nonexistent1';
            
            // Create the token first
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);

            try {
                await tokenContract.bridgeRetire(nonExistentAccount, INITIAL_ISSUE, 'Invalid bridge retire', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('from account does not exist');
            }
        });

        test('Fails to bridge retire more tokens than account balance', async () => {
            expect.assertions(1);
            
            // Create token and bridge issue smaller amount
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.issue('eosio.token', INITIAL_ISSUE, 'Initial issue', signer);
            await tokenContract.bridgeIssue(userAccount, `50.0000 ${SYMBOL}`, 'Bridge issue', signer);
            
            const excessiveAmount = `100.0000 ${SYMBOL}`;

            try {
                await tokenContract.bridgeRetire(userAccount, excessiveAmount, 'Excessive bridge retire', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('overdrawn balance');
            }
        });

        test('Fails to bridge retire tokens with invalid quantity (negative)', async () => {
            expect.assertions(1);
            
            // Create token and bridge issue to account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.bridgeIssue(userAccount, INITIAL_ISSUE, 'Bridge issue', signer);

            try {
                await tokenContract.bridgeRetire(userAccount, `-10.0000 ${SYMBOL}`, 'Invalid bridge retire', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('must be positive quantity');
            }
        });

        test('Fails to bridge retire tokens with invalid quantity (zero)', async () => {
            expect.assertions(1);
            
            // Create token and bridge issue to account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.bridgeIssue(userAccount, INITIAL_ISSUE, 'Bridge issue', signer);

            try {
                await tokenContract.bridgeRetire(userAccount, `0.0000 ${SYMBOL}`, 'Invalid bridge retire', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('must be positive quantity');
            }
        });

        test('Fails to bridge retire tokens with wrong symbol', async () => {
            expect.assertions(1);
            
            // Create token and bridge issue to account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.bridgeIssue(userAccount, INITIAL_ISSUE, 'Bridge issue', signer);

            try {
                await tokenContract.bridgeRetire(userAccount, '50.0000 WRONG', 'Invalid bridge retire', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('token with symbol does not exist');
            }
        });

        test('Fails to bridge retire tokens with wrong precision', async () => {
            expect.assertions(1);
            
            // Create token and bridge issue to account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.bridgeIssue(userAccount, INITIAL_ISSUE, 'Bridge issue', signer);

            try {
                await tokenContract.bridgeRetire(userAccount, `50.00 ${SYMBOL}`, 'Invalid bridge retire', signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('symbol precision mismatch');
            }
        });

        test('Fails to bridge retire tokens with unauthorized signer', async () => {
            expect.assertions(1);
            const wrongSigner = createSigner(PrivateKey.generate("K1"));
            
            // Create token and bridge issue to account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.bridgeIssue(userAccount, INITIAL_ISSUE, 'Bridge issue', signer);

            try {
                await tokenContract.bridgeRetire(userAccount, `50.0000 ${SYMBOL}`, 'Unauthorized bridge retire', wrongSigner);
            } catch (e) {
                expect(e.error.details[0].message).toContain('transaction declares authority');
            }
        });

        test('Fails to bridge retire tokens with memo exceeding 256 bytes', async () => {
            expect.assertions(1);
            const longMemo = 'a'.repeat(257);
            
            // Create token and bridge issue to account
            await tokenContract.create('eosio.token', MAX_SUPPLY, signer);
            await tokenContract.bridgeIssue(userAccount, INITIAL_ISSUE, 'Bridge issue', signer);

            try {
                await tokenContract.bridgeRetire(userAccount, `50.0000 ${SYMBOL}`, longMemo, signer);
            } catch (e) {
                expect(e.error.details[0].message).toContain('memo has more than 256 bytes');
            }
        });
    });
});
