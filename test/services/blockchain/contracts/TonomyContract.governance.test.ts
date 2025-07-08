import { ABI, Action, ActionType, KeyType, PrivateKey, Serializer } from '@wharfkit/antelope';
import {
    createSigner,
    getTonomyOperationsKey,
    transact,
    Authority,
    eosioMsigContract,
    tonomyEosioProxyContract,
    eosioContract,
} from '../../../../src/sdk/services/blockchain';
import { getDeployableFilesFromDir } from '../../../../src/cli/bootstrap/deploy-contract';
import fs from 'fs';
import { sleep } from '../../../../src/sdk/util';
import { randomAccountName, tonomyBoardAccounts, tonomyBoardSigners } from '../../../helpers/eosio';
import { msigAction, tonomyOpsSigner } from './governance';
import { jest } from '@jest/globals';
import Debug from 'debug';

const debug = Debug('tonomy-sdk-tests:services:blockchain:contracts:TonomyContract.governance.test');

describe('TonomyContract class', () => {
    jest.setTimeout(60000);

    describe('native::newaccount()', () => {
        // require_governance_owner()

        let key: PrivateKey;
        let authority: Authority;
        let action: any;
        let randomName: string;

        beforeEach(async () => {
            key = PrivateKey.generate(KeyType.K1);
            authority = Authority.fromKey(key.toPublic().toString());
            randomName = randomAccountName();
            action = {
                account: 'tonomy',
                name: 'newaccount',
                authorization: [
                    {
                        actor: 'tonomy',
                        permission: 'owner',
                    },
                ],
                data: {
                    creator: 'tonomy',
                    name: randomName,
                    owner: authority,
                    active: authority,
                },
            };
        });

        test('sign with tonomy@active should fail', async () => {
            expect.assertions(1);
            action.authorization = [{ actor: 'tonomy', permission: 'active' }];

            try {
                await transact(action, tonomyOpsSigner);
            } catch (e) {
                expect(e.error.details[0].message).toBe('missing authority of tonomy/owner');
            }
        });

        test('sign with tonomy@owner with 1 key should fail', async () => {
            expect.assertions(1);

            try {
                await transact(action, tonomyBoardSigners[0]);
            } catch (e) {
                expect(e.error.details[0].message).toContain('but does not have signatures for it');
            }
        });

        test('sign with tonomy@owner with 2 keys should succeed', async () => {
            expect.assertions(1);
            const trx = await transact(action, tonomyBoardSigners.slice(0, 2));

            expect(trx.processed.receipt.status).toBe('executed');
        });

        test('sign with tonomy@owner with 2 keys using eosio.msig should succeed', async () => {
            try {
                await msigAction(action, { satisfyRequireApproval: true });
            } catch (e) {
                debug(e.message, JSON.stringify(e, null, 2));
                throw e;
            }
        });

        test('sign with tonomy@owner with 1 keys using eosio.msig should fail', async () => {
            try {
                await msigAction(action);
            } catch (e) {
                debug(e.message, JSON.stringify(e, null, 2));
                throw e;
            }
        });

        test('sign with random@owner with board should succeed', async () => {
            expect.assertions(1);

            // Setup next account to create, signed by the new account

            action.data.creator = randomName;
            action.data.name = randomAccountName();
            action.authorization.push({ actor: randomName, permission: 'active' });
            const randomAccountSigner = createSigner(key);

            const trx = await transact(action, [randomAccountSigner, tonomyBoardSigners[0], tonomyBoardSigners[1]]);

            expect(trx.processed.receipt.status).toBe('executed');
        });

        test('sign with random@owner without board should fail', async () => {
            expect.assertions(1);

            // Setup next account to create, signed by the new account
            action.data.creator = randomName;
            action.data.name = randomAccountName();
            action.authorization = [{ actor: randomName, permission: 'active' }];
            const randomAccountSigner = createSigner(key);

            try {
                await transact(action, [randomAccountSigner]);
            } catch (e) {
                expect(e.error.details[0].message).toBe('missing authority of tonomy/owner');
            }
        });
    });

    describe('native::updateauth()', () => {
        describe('update eosio@[new] auth', () => {
            // special_governance_check()
            let key: PrivateKey;
            let authority: Authority;
            let action: any;
            let newPermission: string;

            beforeEach(() => {
                key = PrivateKey.generate(KeyType.K1);
                authority = Authority.fromKey(key.toPublic().toString());
                newPermission = randomAccountName();

                action = {
                    account: 'tonomy',
                    name: 'updateauth',
                    authorization: [
                        {
                            actor: 'tonomy',
                            permission: 'owner',
                        },
                    ],
                    data: {
                        account: 'eosio',
                        permission: newPermission,
                        parent: 'owner',
                        auth: authority,
                        // eslint-disable-next-line camelcase
                        auth_parent: true, // should be true when a new permission is being created, otherwise false
                    },
                };
            });

            test('sign with tonomy@owner should succeed', async () => {
                expect.assertions(1);

                try {
                    const trx = await transact(action, tonomyBoardSigners.slice(0, 2));

                    expect(trx.processed.receipt.status).toBe('executed');
                } catch (e) {
                    debug(e.message, JSON.stringify(e, null, 2));
                    throw e;
                }
            });

            test('sign with tonomy@owner with only one board key should fail', async () => {
                expect.assertions(1);

                try {
                    await transact(action, tonomyBoardSigners[0]);
                } catch (e) {
                    expect(e.error.details[0].message).toContain('but does not have signatures for it');
                }
            });

            test('sign with tonomy@active should fail', async () => {
                expect.assertions(1);

                try {
                    await transact(action, tonomyOpsSigner);
                } catch (e) {
                    expect(e.error.details[0].message).toContain('but does not have signatures for it');
                }
            });

            test('sign with tonomy@owner should succeed', async () => {
                expect.assertions(1);

                try {
                    action.authorization = [{ actor: 'tonomy', permission: 'owner' }];
                    const trx = await transact(action, tonomyBoardSigners.slice(0, 2));

                    expect(trx.processed.receipt.status).toBe('executed');
                } catch (e) {
                    debug(e.message, JSON.stringify(e, null, 2));
                    throw e;
                }
            });

            test('sign with tonomy@owner using eosio.msig 2 keys should succeed', async () => {
                expect.assertions(3);

                try {
                    await msigAction(action, { satisfyRequireApproval: true });
                } catch (e) {
                    debug(e.message, JSON.stringify(e, null, 2));
                    throw e;
                }
            });

            test('sign with tonomy@owner using eosio.msig 1 keys should fail', async () => {
                expect.assertions(3);

                try {
                    await msigAction(action);
                } catch (e) {
                    debug(e.message, JSON.stringify(e, null, 2));
                    throw e;
                }
            });
        });

        describe('update found.tmy auth', () => {
            const newAccounts = [randomAccountName(), randomAccountName(), randomAccountName()];
            const newKeys = newAccounts.map(() => PrivateKey.generate(KeyType.K1));
            const newAuthorities = newKeys.map((key) => Authority.fromKey(key.toPublic().toString()));
            const newSigners = newKeys.map((key) => createSigner(key));

            beforeAll(async () => {
                function newAccountAction(name: string, authority: Authority) {
                    return Action.from({
                        account: 'tonomy',
                        name: 'newaccount',
                        authorization: [
                            {
                                actor: 'tonomy',
                                permission: 'owner',
                            },
                        ],
                        data: {
                            creator: 'tonomy',
                            name,
                            owner: authority,
                            active: authority,
                        },
                    });
                }

                // Create new accounts to use as new governance accounts
                const actions: ActionType[] = [];

                for (let i = 0; i < newAccounts.length; i++) {
                    actions.push(newAccountAction(newAccounts[i], newAuthorities[i]));
                }

                await transact(actions, tonomyBoardSigners.slice(0, 2));
            });

            test('found.tmy@owner update and sign with tonomy@owner using 2 board keys and change back should succeed', async () => {
                expect.assertions(1);

                const updateAuthAction = Action.from({
                    account: 'tonomy',
                    name: 'updateauth',
                    authorization: [
                        {
                            actor: 'tonomy',
                            permission: 'owner',
                        },
                        {
                            actor: 'tonomy',
                            permission: 'active',
                        },
                    ],
                    data: {
                        account: 'found.tmy',
                        permission: 'owner',
                        parent: '',
                        auth: Authority.fromAccountArray(newAccounts, 'active', 2),
                        // eslint-disable-next-line camelcase
                        auth_parent: false, // should be true when a new permission is being created, otherwise false
                    },
                });

                try {
                    await transact([updateAuthAction], tonomyBoardSigners.slice(0, 2));
                    await restoreFoundTmyAuth();
                } catch (e) {
                    debug(e.message, JSON.stringify(e, null, 2));
                    throw e;
                }
            });

            test('found.tmy@owner update and sign with tonomy@owner using 2 eosio.msig with board keys and change back should succeed', async () => {
                expect.assertions(3);

                const updateAuthAction = Action.from({
                    account: 'tonomy',
                    name: 'updateauth',
                    authorization: [
                        {
                            actor: 'tonomy',
                            permission: 'owner',
                        },
                        {
                            actor: 'tonomy',
                            permission: 'active',
                        },
                    ],
                    data: {
                        account: 'found.tmy',
                        permission: 'owner',
                        parent: '',
                        auth: Authority.fromAccountArray(newAccounts, 'active', 2),
                        // eslint-disable-next-line camelcase
                        auth_parent: false, // should be true when a new permission is being created, otherwise false
                    },
                });

                try {
                    await sleep(1000);
                    await transact([updateAuthAction], tonomyBoardSigners.slice(0, 2));

                    const proposalName = randomAccountName();
                    const proposer = '1.found.tmy';

                    const requested = newAccounts.map((account) => {
                        return { actor: account, permission: 'active' };
                    });

                    const updateAuthActionRestore = Action.from({
                        account: 'tonomy',
                        name: 'updateauth',
                        authorization: [
                            {
                                actor: 'tonomy',
                                permission: 'owner',
                            },
                            {
                                actor: 'tonomy',
                                permission: 'active',
                            },
                        ],
                        data: {
                            account: 'found.tmy',
                            permission: 'owner',
                            parent: '',
                            auth: Authority.fromAccountArray(tonomyBoardAccounts, 'active', 2),
                            // eslint-disable-next-line camelcase
                            auth_parent: false, // should be true when a new permission is being created, otherwise false
                        },
                    });

                    const { proposalHash, transaction } = await eosioMsigContract.propose(
                        proposer,
                        proposalName,
                        requested,
                        [updateAuthActionRestore],
                        tonomyBoardSigners[0]
                    );

                    expect(transaction.processed.receipt.status).toBe('executed');

                    const approve1Trx = await eosioMsigContract.approve(
                        proposer,
                        proposalName,
                        { actor: newAccounts[0], permission: 'active' },
                        proposalHash,
                        newSigners[0]
                    );

                    expect(approve1Trx.processed.receipt.status).toBe('executed');

                    await eosioMsigContract.approve(
                        proposer,
                        proposalName,
                        { actor: newAccounts[1], permission: 'active' },
                        proposalHash,
                        newSigners[1]
                    );
                    const execTrx = await eosioMsigContract.exec(
                        proposer,
                        proposalName,
                        '1.found.tmy',
                        tonomyBoardSigners[0]
                    );

                    expect(execTrx.processed.receipt.status).toBe('executed');
                } catch (e) {
                    debug(e.message, JSON.stringify(e, null, 2));
                    throw e;
                }
            });

            async function restoreFoundTmyAuth() {
                const updateAuthAction = Action.from({
                    account: 'tonomy',
                    name: 'updateauth',
                    authorization: [
                        {
                            actor: 'tonomy',
                            permission: 'owner',
                        },
                        {
                            actor: 'tonomy',
                            permission: 'active',
                        },
                    ],
                    data: {
                        account: 'found.tmy',
                        permission: 'owner',
                        parent: '',
                        auth: Authority.fromAccountArray(tonomyBoardAccounts, 'active', 2),
                        // eslint-disable-next-line camelcase
                        auth_parent: false, // should be true when a new permission is being created, otherwise false
                    },
                });

                const transaction = await transact([updateAuthAction], tonomyBoardSigners.slice(0, 2));

                expect(transaction.processed.receipt.status).toBe('executed');
            }
        });

        describe('update ops.tmy auth', () => {
            const govTmyActiveAuthority = Authority.fromAccount({ actor: 'gov.tmy', permission: 'active' });
            const oldTmyActiveAuthority = Authority.fromAccount({ actor: 'gov.tmy', permission: 'active' });

            oldTmyActiveAuthority.addKey(getTonomyOperationsKey().toPublic().toString(), 1);

            test('remove (1 of 2) public key using 2 board keys and change back should succeed', async () => {
                expect.assertions(2);

                const updateAuthActionRaw = {
                    account: 'tonomy',
                    name: 'updateauth',
                    authorization: [
                        {
                            actor: 'tonomy',
                            permission: 'owner',
                        },
                        {
                            actor: 'ops.tmy',
                            permission: 'active',
                        },
                        {
                            actor: 'tonomy',
                            permission: 'active',
                        },
                    ],
                    data: {
                        account: 'ops.tmy',
                        permission: 'active',
                        parent: 'owner',
                        auth: govTmyActiveAuthority,
                        // eslint-disable-next-line camelcase
                        auth_parent: false, // should be true when a new permission is being created, otherwise false
                    },
                };
                const updateAuthAction = Action.from(updateAuthActionRaw);

                let transaction = await transact([updateAuthAction], tonomyBoardSigners.slice(0, 2));

                expect(transaction.processed.receipt.status).toBe('executed');
                updateAuthActionRaw.data.auth = oldTmyActiveAuthority;
                transaction = await transact([Action.from(updateAuthActionRaw)], tonomyBoardSigners.slice(0, 2));
                expect(transaction.processed.receipt.status).toBe('executed');
            });

            test('remove (1 of 2) public key using eosio.msig with 2 board keys and change back should succeed', async () => {
                expect.assertions(6);

                const updateAuthActionRaw = {
                    account: 'tonomy',
                    name: 'updateauth',
                    authorization: [
                        {
                            actor: 'tonomy',
                            permission: 'owner',
                        },
                        {
                            actor: 'ops.tmy',
                            permission: 'active',
                        },
                        {
                            actor: 'tonomy',
                            permission: 'active',
                        },
                    ],
                    data: {
                        account: 'ops.tmy',
                        permission: 'active',
                        parent: 'owner',
                        auth: govTmyActiveAuthority,
                        // eslint-disable-next-line camelcase
                        auth_parent: false, // should be true when a new permission is being created, otherwise false
                    },
                };
                const updateAuthAction = Action.from(updateAuthActionRaw);

                await msigAction([updateAuthAction], { satisfyRequireApproval: true });

                updateAuthActionRaw.data.auth = oldTmyActiveAuthority;
                await msigAction([Action.from(updateAuthActionRaw)], { satisfyRequireApproval: true });
            });
        });
    });

    describe('native::setcode()', () => {
        // special_governance_check() + eosio.tonomy special checks
        let key: PrivateKey;
        let authority: Authority;
        let createAccountAction: ActionType;
        let newAccount: string;
        let actions: ActionType[];

        const { wasmPath, abiPath } = getDeployableFilesFromDir('./Tonomy-Contracts/contracts/eosio.bios');
        const wasmFile = fs.readFileSync(wasmPath);
        const abiFile = fs.readFileSync(abiPath, 'utf8');

        beforeEach(() => {
            key = PrivateKey.generate(KeyType.K1);
            authority = Authority.fromKey(key.toPublic().toString());
            newAccount = randomAccountName();

            createAccountAction = Action.from({
                account: 'tonomy',
                name: 'newaccount',
                authorization: [
                    {
                        actor: 'tonomy',
                        permission: 'owner',
                    },
                ],
                data: {
                    creator: 'tonomy',
                    name: newAccount,
                    owner: authority,
                    active: authority,
                },
            });

            // 1. Prepare SETCODE
            // read the file and make a hex string out of it
            const wasm = wasmFile.toString(`hex`);

            // 2. Prepare SETABI
            const abi = JSON.parse(abiFile);
            const abiDef = ABI.from(abi);
            const abiSerializedHex = Serializer.encode({ object: abiDef }).hexString;

            // 3. Send transaction with both setcode and setabi actions
            const setCodeAction = Action.from({
                account: 'eosio',
                name: 'setcode',
                authorization: [
                    {
                        actor: 'eosio',
                        permission: 'active',
                    },
                    {
                        actor: 'tonomy',
                        permission: 'owner',
                    },
                ],
                data: {
                    account: 'eosio',
                    vmtype: 0,
                    vmversion: 0,
                    code: wasm,
                },
            });

            const setAbiAction = Action.from({
                account: 'eosio',
                name: 'setabi',
                authorization: [
                    {
                        actor: 'eosio',
                        permission: 'active',
                    },
                    {
                        actor: 'tonomy',
                        permission: 'owner',
                    },
                ],
                data: {
                    account: 'eosio',
                    abi: abiSerializedHex,
                },
            });

            actions = [setCodeAction, setAbiAction];
        });

        describe('new account with contract', () => {
            test('sign with tonomy@active and newaccount keys should succeed', async () => {
                expect.assertions(1);

                await transact([createAccountAction], tonomyBoardSigners.slice(0, 2));

                const trx = await tonomyEosioProxyContract.deployContract(
                    newAccount,
                    wasmFile,
                    abiFile,
                    [createSigner(key), tonomyOpsSigner],
                    { actor: 'tonomy', permission: 'active' }
                );

                expect(trx.processed.receipt.status).toBe('executed');
            });

            test('sign with tonomy@active key should fail', async () => {
                expect.assertions(1);

                try {
                    await transact([createAccountAction], tonomyBoardSigners.slice(0, 2));

                    await tonomyEosioProxyContract.deployContract(newAccount, wasmFile, abiFile, [tonomyOpsSigner], {
                        actor: 'tonomy',
                        permission: 'active',
                    });
                } catch (e) {
                    expect(e.error.details[0].message).toContain('but does not have signatures for it');
                }
            });

            test('sign with newaccount key should fail', async () => {
                expect.assertions(1);

                try {
                    await transact([createAccountAction], tonomyBoardSigners.slice(0, 2));

                    await tonomyEosioProxyContract.deployContract(newAccount, wasmFile, abiFile, createSigner(key));
                } catch (e) {
                    expect(e.error.details[0].message).toContain(`missing authority of tonomy/active`);
                }
            });
        });

        describe('deploy eosio contract (special)', () => {
            test('sign without tonomy@owner authority should fail', async () => {
                expect.assertions(1);

                try {
                    await tonomyEosioProxyContract.deployContract('eosio', wasmFile, abiFile, tonomyOpsSigner);
                } catch (e) {
                    expect(e.error.details[0].message).toContain(`missing authority of tonomy/owner`);
                }
            });

            test('sign with tonomy@owner with ops.tmy signer should fail', async () => {
                expect.assertions(1);

                try {
                    await tonomyEosioProxyContract.deployContract('eosio', wasmFile, abiFile, tonomyOpsSigner, {
                        actor: 'tonomy',
                        permission: 'owner',
                    });
                } catch (e) {
                    expect(e.error.details[0].message).toContain(`but does not have signatures for it`);
                }
            });

            test('sign with tonomy@owner with one board signer should fail', async () => {
                expect.assertions(1);

                try {
                    await tonomyEosioProxyContract.deployContract('eosio', wasmFile, abiFile, tonomyBoardSigners[0], {
                        actor: 'tonomy',
                        permission: 'owner',
                    });
                } catch (e) {
                    expect(e.error.details[0].message).toContain(`but does not have signatures for it`);
                }
            });

            test('sign with tonomy@owner with two board signers should fail', async () => {
                expect.assertions(1);

                try {
                    await tonomyEosioProxyContract.deployContract(
                        'eosio',
                        wasmFile,
                        abiFile,
                        tonomyBoardSigners.slice(0, 2),
                        {
                            actor: 'tonomy',
                            permission: 'owner',
                        }
                    );
                } catch (e) {
                    expect(e.error.details[0].message).toContain(`but does not have signatures for it`);
                }
            });

            test('sign with tonomy@owner with two board signers and Tonomy ops signer should succeed', async () => {
                expect.assertions(1);

                const trx = await tonomyEosioProxyContract.deployContract(
                    'eosio',
                    wasmFile,
                    abiFile,
                    [...tonomyBoardSigners.slice(0, 2), tonomyOpsSigner],
                    { actor: 'tonomy', permission: 'owner' }
                );

                expect(trx.processed.receipt.status).toBe('executed');

                await restoreEosioTonomyContract();
            });

            test('sign with tonomy@owner with eosio.msig and two board + Tonomy ops signer should succeed', async () => {
                expect.assertions(3);

                await msigAction(actions, { satisfyRequireApproval: true, requireTonomyOps: true });

                await restoreEosioTonomyContract();
            });

            test('sign with tonomy@owner using eosio.msig with one board + tonomy ops signers should fail', async () => {
                expect.assertions(3);

                await msigAction(actions, { requireTonomyOps: true });
            });
        });

        describe('deploy tonomy contract (special)', () => {
            test('sign with tonomy@owner with two board signers should succeed', async () => {
                expect.assertions(2);
                const trx = await eosioContract.deployContract(
                    'tonomy',
                    wasmFile,
                    abiFile,
                    tonomyBoardSigners.slice(0, 2),
                    { actor: 'tonomy', permission: 'owner' }
                );

                expect(trx.processed.receipt.status).toBe('executed');
                await restoreTonomyContract();
            });

            test('using tonomy contract, sign with tonomy@owner with two board signers should succeed', async () => {
                expect.assertions(2);
                await sleep(1000);
                const trx = await tonomyEosioProxyContract.deployContract(
                    'tonomy',
                    wasmFile,
                    abiFile,
                    tonomyBoardSigners.slice(0, 2),
                    { actor: 'tonomy', permission: 'owner' }
                );

                expect(trx.processed.receipt.status).toBe('executed');
                await restoreTonomyContract();
            });
        });

        async function restoreEosioTonomyContract() {
            // Deploy eosio.tonomy contract back in place
            const { wasmPath, abiPath } = getDeployableFilesFromDir('./Tonomy-Contracts/contracts/eosio.tonomy');
            const wasmFile = fs.readFileSync(wasmPath);
            const abiFile = fs.readFileSync(abiPath, 'utf8');

            await tonomyEosioProxyContract.deployContract(
                'eosio',
                wasmFile,
                abiFile,
                [...tonomyBoardSigners.slice(0, 2), tonomyOpsSigner],
                { actor: 'tonomy', permission: 'owner' }
            );
        }

        async function restoreTonomyContract() {
            // Deploy tonomy contract back in place
            const { wasmPath, abiPath } = getDeployableFilesFromDir('./Tonomy-Contracts/contracts/tonomy');
            const wasmFile = fs.readFileSync(wasmPath);
            const abiFile = fs.readFileSync(abiPath, 'utf8');

            const transaction = await eosioContract.deployContract(
                'tonomy',
                wasmFile,
                abiFile,
                [...tonomyBoardSigners.slice(0, 2), tonomyOpsSigner],
                { actor: 'tonomy', permission: 'owner' }
            );

            expect(transaction.processed.receipt.status).toBe('executed');
        }
    });
});
