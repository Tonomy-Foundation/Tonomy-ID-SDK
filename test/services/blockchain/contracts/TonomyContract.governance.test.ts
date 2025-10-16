import { Action, AuthorityType, KeyType, NameType, PrivateKey } from '@wharfkit/antelope';
import {
    createSigner,
    getTonomyOperationsKey,
    transact,
    Authority,
    getEosioMsigContract,
    getTonomyEosioProxyContract,
    getEosioContract,
    activeAuthority,
    ownerAuthority,
    activePermissionLevel,
    ownerPermissionLevel,
} from '../../../../src/sdk/services/blockchain';
import { getDeployableFiles } from '../../../../src/cli/bootstrap/deploy-contract';
import { sleep } from '../../../../src/sdk/util';
import {
    createRandomAccount,
    randomAccountName,
    tonomyBoardAccounts,
    tonomyBoardSigners,
} from '../../../helpers/eosio';
import { msigAction, tonomyOpsSigner } from './governance';
import { jest } from '@jest/globals';
import Debug from 'debug';

const debug = Debug('tonomy-sdk-tests:services:blockchain:contracts:TonomyContract.governance.test');

describe('TonomyContract class', () => {
    jest.setTimeout(60000);

    describe('native::newaccount()', () => {
        let key: PrivateKey;
        let authority: Authority;
        let randomName: string;
        let actionData: {
            creator: NameType;
            name: NameType;
            owner: AuthorityType;
            active: AuthorityType;
        };

        beforeEach(async () => {
            key = PrivateKey.generate(KeyType.K1);
            authority = Authority.fromKey(key.toPublic().toString());
            randomName = randomAccountName();
            actionData = {
                creator: 'tonomy',
                name: randomName,
                owner: authority,
                active: authority,
            };
        });

        test('sign with tonomy@active should fail', async () => {
            expect.assertions(1);
            const auth = { authorization: [{ actor: 'tonomy', permission: 'active' }] };

            const action = getTonomyEosioProxyContract().actions.newAccount(actionData, auth);

            try {
                await transact(action, tonomyOpsSigner);
            } catch (e) {
                expect(e.error.details[0].message).toBe('missing authority of tonomy/owner');
            }
        });

        test('sign with tonomy@owner with 1 key should fail', async () => {
            expect.assertions(1);
            const auth = { authorization: [{ actor: 'tonomy', permission: 'owner' }] };

            const action = getTonomyEosioProxyContract().actions.newAccount(actionData, auth);

            try {
                await transact(action, tonomyBoardSigners[0]);
            } catch (e) {
                expect(e.error.details[0].message).toContain('but does not have signatures for it');
            }
        });

        test('sign with tonomy@owner with 2 keys should succeed', async () => {
            expect.assertions(1);
            const auth = { authorization: [{ actor: 'tonomy', permission: 'owner' }] };

            const action = getTonomyEosioProxyContract().actions.newAccount(actionData, auth);
            const trx = await transact(action, tonomyBoardSigners.slice(0, 2));

            expect(trx.processed.receipt.status).toBe('executed');
        });

        test('sign with tonomy@owner with 2 keys using eosio.msig should succeed', async () => {
            try {
                const auth = { authorization: [{ actor: 'tonomy', permission: 'owner' }] };

                const action = getTonomyEosioProxyContract().actions.newAccount(actionData, auth);

                await msigAction(action, { satisfyRequireApproval: true });
            } catch (e) {
                debug(e.message, JSON.stringify(e, null, 2));
                throw e;
            }
        });

        test('sign with tonomy@owner with 1 keys using eosio.msig should fail', async () => {
            try {
                const auth = { authorization: [{ actor: 'tonomy', permission: 'owner' }] };

                const action = getTonomyEosioProxyContract().actions.newAccount(actionData, auth);

                await msigAction(action);
            } catch (e) {
                debug(e.message, JSON.stringify(e, null, 2));
                throw e;
            }
        });

        test('sign with random@active with board should succeed', async () => {
            expect.assertions(1);

            const randomAccountSigner = createSigner(key);
            const { name: randomName } = await createRandomAccount(authority);
            const auth = {
                authorization: [
                    { actor: randomName, permission: 'active' },
                    { actor: 'tonomy', permission: 'owner' },
                ],
            };

            const action = getTonomyEosioProxyContract().actions.newAccount(
                {
                    creator: randomName,
                    name: randomAccountName(),
                    owner: authority,
                    active: authority,
                },
                auth
            );

            const trx = await transact(action, [randomAccountSigner, tonomyBoardSigners[0], tonomyBoardSigners[1]]);

            expect(trx.processed.receipt.status).toBe('executed');
        });

        test('sign with random@active without board should fail', async () => {
            expect.assertions(1);

            const randomAccountSigner = createSigner(key);
            const { name: randomName } = await createRandomAccount(authority);
            const auth = {
                authorization: [
                    { actor: randomName, permission: 'active' },
                    { actor: 'tonomy', permission: 'owner' },
                ],
            };

            const action = getTonomyEosioProxyContract().actions.newAccount(
                {
                    creator: randomName,
                    name: randomAccountName(),
                    owner: authority,
                    active: authority,
                },
                auth
            );

            try {
                await transact(action, [randomAccountSigner]);
            } catch (e) {
                expect(e.error.details[0].message).toContain(
                    'transaction declares authority \'{"actor":"tonomy","permission":"owner"}\', but does not have signatures for it under a provided delay'
                );
            }
        });

        test('sign using action helper should succeed', async () => {
            expect.assertions(1);

            const action = getTonomyEosioProxyContract().actions.newAccount(actionData);

            const trx = await transact(action, tonomyBoardSigners.slice(0, 2));

            expect(trx.processed.receipt.status).toBe('executed');
        });

        test('sign using action helper should succeed with randomAccount should succeed', async () => {
            expect.assertions(1);

            const randomAccountSigner = createSigner(key);
            const { name: randomName } = await createRandomAccount(authority);
            const action = getTonomyEosioProxyContract().actions.newAccount({
                creator: randomName,
                name: randomAccountName(),
                owner: authority,
                active: authority,
            });

            const trx = await transact(action, [randomAccountSigner, tonomyBoardSigners[0], tonomyBoardSigners[1]]);

            expect(trx.processed.receipt.status).toBe('executed');
        });
    });

    describe('native::updateauth()', () => {
        describe('update eosio@[new] auth', () => {
            let key: PrivateKey;
            let authority: Authority;
            let actionData: {
                account: NameType;
                permission: NameType;
                parent: NameType;
                auth: AuthorityType;
                authParent?: boolean;
            };
            let newPermission: string;

            beforeEach(() => {
                key = PrivateKey.generate(KeyType.K1);
                authority = Authority.fromKey(key.toPublic().toString());
                newPermission = randomAccountName();
                actionData = {
                    account: 'eosio',
                    permission: newPermission,
                    parent: 'owner',
                    auth: authority,
                    authParent: true, // should be true when a new permission is being created, otherwise false
                };
            });

            test('sign with tonomy@owner should succeed', async () => {
                expect.assertions(1);

                try {
                    const auth = {
                        authorization: [{ actor: 'tonomy', permission: 'owner' }],
                    };
                    const action = getTonomyEosioProxyContract().actions.updateAuth(actionData, auth);
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
                    const auth = ownerAuthority('tonomy');
                    const action = getTonomyEosioProxyContract().actions.updateAuth(actionData, auth);

                    await transact(action, tonomyBoardSigners[0]);
                } catch (e) {
                    expect(e.error.details[0].message).toContain('but does not have signatures for it');
                }
            });

            test('sign with tonomy@active should fail', async () => {
                expect.assertions(1);

                try {
                    const auth = activeAuthority('tonomy');
                    const action = getTonomyEosioProxyContract().actions.updateAuth(actionData, auth);

                    await transact(action, tonomyOpsSigner);
                } catch (e) {
                    expect(e.error.details[0].message).toContain('missing authority of tonomy/owner');
                }
            });

            test('sign with tonomy@owner should succeed', async () => {
                expect.assertions(1);

                const auth = ownerAuthority('tonomy');
                const action = getTonomyEosioProxyContract().actions.updateAuth(actionData, auth);
                const trx = await transact(action, tonomyBoardSigners.slice(0, 2));

                expect(trx.processed.receipt.status).toBe('executed');
            });

            test('sign with tonomy@owner using eosio.msig 2 keys should succeed', async () => {
                expect.assertions(3);

                const auth = ownerAuthority('tonomy');
                const action = getTonomyEosioProxyContract().actions.updateAuth(actionData, auth);

                await msigAction(action, { satisfyRequireApproval: true });
            });

            test('sign with tonomy@owner using eosio.msig 1 keys should fail', async () => {
                expect.assertions(3);

                const auth = ownerAuthority('tonomy');
                const action = getTonomyEosioProxyContract().actions.updateAuth(actionData, auth);

                try {
                    await msigAction(action);
                } catch (e) {
                    expect(e.error.details[0].message).toContain('but does not have signatures for it');
                }
            });

            test('sign using the helpers should succeed', async () => {
                expect.assertions(1);

                const action = getTonomyEosioProxyContract().actions.updateAuth(actionData);
                const trx = await transact(action, tonomyBoardSigners.slice(0, 2));

                expect(trx.processed.receipt.status).toBe('executed');
            });
        });

        describe('update found.tmy auth', () => {
            const newAccounts = [randomAccountName(), randomAccountName(), randomAccountName()];
            const newKeys = newAccounts.map(() => PrivateKey.generate(KeyType.K1));
            const newAuthorities = newKeys.map((key) => Authority.fromKey(key.toPublic().toString()));
            const newSigners = newKeys.map((key) => createSigner(key));
            const auth = ownerAuthority('tonomy');

            auth.authorization!.push(activePermissionLevel('tonomy'));

            beforeAll(async () => {
                const auth = ownerAuthority('tonomy');

                function newAccountAction(name: string, authority: Authority): Action {
                    return getTonomyEosioProxyContract().actions.newAccount(
                        {
                            creator: 'tonomy',
                            name,
                            owner: authority,
                            active: authority,
                        },
                        auth
                    );
                }

                // Create new accounts to use as new governance accounts
                const actions: Action[] = [];

                for (let i = 0; i < newAccounts.length; i++) {
                    actions.push(newAccountAction(newAccounts[i], newAuthorities[i]));
                }

                await transact(actions, tonomyBoardSigners.slice(0, 2));
            });

            test('found.tmy@owner update and sign with tonomy@owner using 2 board keys and change back should succeed', async () => {
                expect.assertions(1);

                const updateAuthAction = getTonomyEosioProxyContract().actions.updateAuth(
                    {
                        account: 'found.tmy',
                        permission: 'owner',
                        parent: '',
                        auth: Authority.fromAccountArray(newAccounts, 'active', 2),
                        authParent: false,
                    },
                    auth
                );

                await transact(updateAuthAction, tonomyBoardSigners.slice(0, 2));
                await restoreFoundTmyAuth();
            });

            test('found.tmy@owner update and sign with tonomy@owner using 2 eosio.msig with board keys and change back should succeed', async () => {
                expect.assertions(3);

                const updateAuthAction = getTonomyEosioProxyContract().actions.updateAuth(
                    {
                        account: 'found.tmy',
                        permission: 'owner',
                        parent: '',
                        auth: Authority.fromAccountArray(newAccounts, 'active', 2),
                        authParent: false,
                    },
                    auth
                );

                await transact(updateAuthAction, tonomyBoardSigners.slice(0, 2));

                const proposalName = randomAccountName();
                const proposer = '1.found.tmy';

                const requested = newAccounts.map((account) => activePermissionLevel(account));

                const updateAuthActionRestore = getTonomyEosioProxyContract().actions.updateAuth(
                    {
                        account: 'found.tmy',
                        permission: 'owner',
                        parent: '',
                        auth: Authority.fromAccountArray(tonomyBoardAccounts, 'active', 2),
                        authParent: false,
                    },
                    auth
                );

                const { proposalHash, transaction } = await getEosioMsigContract().propose(
                    proposer,
                    proposalName,
                    requested,
                    [updateAuthActionRestore],
                    tonomyBoardSigners[0]
                );

                expect(transaction.processed.receipt.status).toBe('executed');

                const approve1Trx = await getEosioMsigContract().approve(
                    proposer,
                    proposalName,
                    activePermissionLevel(newAccounts[0]),
                    proposalHash,
                    newSigners[0]
                );

                expect(approve1Trx.processed.receipt.status).toBe('executed');

                await getEosioMsigContract().approve(
                    proposer,
                    proposalName,
                    activePermissionLevel(newAccounts[1]),
                    proposalHash,
                    newSigners[1]
                );
                const execTrx = await getEosioMsigContract().exec(
                    proposer,
                    proposalName,
                    '1.found.tmy',
                    tonomyBoardSigners[0]
                );

                expect(execTrx.processed.receipt.status).toBe('executed');
            });

            async function restoreFoundTmyAuth() {
                const updateAuthAction = getTonomyEosioProxyContract().actions.updateAuth(
                    {
                        account: 'found.tmy',
                        permission: 'owner',
                        parent: '',
                        auth: Authority.fromAccountArray(tonomyBoardAccounts, 'active', 2),
                        authParent: false,
                    },
                    auth
                );
                const transaction = await transact([updateAuthAction], newSigners.slice(0, 2));

                expect(transaction.processed.receipt.status).toBe('executed');
            }
        });

        describe('update ops.tmy auth', () => {
            const govTmyActiveAuthority = Authority.fromAccount({ actor: 'gov.tmy', permission: 'active' });
            const oldTmyActiveAuthority = Authority.fromAccount({ actor: 'gov.tmy', permission: 'active' });

            oldTmyActiveAuthority.addKey(getTonomyOperationsKey().toPublic().toString(), 1);

            test('remove (1 of 2) public key using 2 board keys and change back should succeed', async () => {
                expect.assertions(2);

                const auth = ownerAuthority('tonomy');

                auth.authorization!.push(activePermissionLevel('tonomy'));
                auth.authorization!.push(activePermissionLevel('ops.tmy'));
                const updateAuthAction = getTonomyEosioProxyContract().actions.updateAuth(
                    {
                        account: 'ops.tmy',
                        permission: 'active',
                        parent: 'owner',
                        auth: govTmyActiveAuthority,
                        authParent: false,
                    },
                    auth
                );

                let transaction = await transact(updateAuthAction, tonomyBoardSigners.slice(0, 2));

                expect(transaction.processed.receipt.status).toBe('executed');
                const updateAuthAction2 = getTonomyEosioProxyContract().actions.updateAuth(
                    {
                        account: 'ops.tmy',
                        permission: 'active',
                        parent: 'owner',
                        auth: oldTmyActiveAuthority,
                        authParent: false,
                    },
                    auth
                );

                transaction = await transact(updateAuthAction2, tonomyBoardSigners.slice(0, 2));
                expect(transaction.processed.receipt.status).toBe('executed');
            });

            test('remove (1 of 2) public key using eosio.msig with 2 board keys and change back should succeed', async () => {
                expect.assertions(6);

                const auth = ownerAuthority('tonomy');

                auth.authorization!.push(activePermissionLevel('tonomy'));
                auth.authorization!.push(activePermissionLevel('ops.tmy'));
                const updateAuthAction = getTonomyEosioProxyContract().actions.updateAuth(
                    {
                        account: 'ops.tmy',
                        permission: 'active',
                        parent: 'owner',
                        auth: govTmyActiveAuthority,
                        authParent: false,
                    },
                    auth
                );

                await msigAction(updateAuthAction, { satisfyRequireApproval: true });

                const updateAuthAction2 = getTonomyEosioProxyContract().actions.updateAuth(
                    {
                        account: 'ops.tmy',
                        permission: 'active',
                        parent: 'owner',
                        auth: oldTmyActiveAuthority,
                        authParent: false,
                    },
                    auth
                );

                await msigAction(updateAuthAction2, { satisfyRequireApproval: true });
            });
        });
    });

    describe('native::setcode()', () => {
        // special_governance_check() + eosio.tonomy special checks
        let key: PrivateKey;
        let authority: Authority;
        let createAccountAction: Action;
        let newAccount: string;
        let actions: Action[];

        const { wasmFile, abiFile } = getDeployableFiles('eosio.bios');

        beforeEach(async () => {
            key = PrivateKey.generate(KeyType.K1);
            authority = Authority.fromKey(key.toPublic().toString());
            newAccount = randomAccountName();

            createAccountAction = getTonomyEosioProxyContract().actions.newAccount({
                creator: 'tonomy',
                name: newAccount,
                owner: authority,
                active: authority,
            });

            actions = await getTonomyEosioProxyContract().deployContractActions('eosio', wasmFile, abiFile);
        });

        describe('new account with contract', () => {
            test('sign with tonomy@active and newaccount@active should succeed', async () => {
                expect.assertions(1);

                await transact(createAccountAction, tonomyBoardSigners.slice(0, 2));

                const trx = await getTonomyEosioProxyContract().deployContract(
                    newAccount,
                    wasmFile,
                    abiFile,
                    [createSigner(key), tonomyOpsSigner],
                    [activePermissionLevel('tonomy'), activePermissionLevel(newAccount)]
                );

                expect(trx.processed.receipt.status).toBe('executed');
            });

            test('sign with only tonomy@active key should fail', async () => {
                expect.assertions(1);

                try {
                    await transact(createAccountAction, tonomyBoardSigners.slice(0, 2));

                    await getTonomyEosioProxyContract().deployContract(
                        newAccount,
                        wasmFile,
                        abiFile,
                        [tonomyOpsSigner],
                        activePermissionLevel('tonomy')
                    );
                } catch (e) {
                    expect(e.error.details[0].message).toContain(`missing authority of ${newAccount}`);
                }
            });

            test('sign with only newaccount@active should fail', async () => {
                expect.assertions(1);

                try {
                    await transact(createAccountAction, tonomyBoardSigners.slice(0, 2));

                    await getTonomyEosioProxyContract().deployContract(
                        newAccount,
                        wasmFile,
                        abiFile,
                        createSigner(key),
                        activePermissionLevel(newAccount)
                    );
                } catch (e) {
                    expect(e.error.details[0].message).toContain(`missing authority of tonomy/active`);
                }
            });
        });

        describe('deploy eosio contract (special)', () => {
            test('sign without tonomy@owner authority should fail', async () => {
                expect.assertions(1);

                try {
                    await getTonomyEosioProxyContract().deployContract(
                        'eosio',
                        wasmFile,
                        abiFile,
                        tonomyOpsSigner,
                        activePermissionLevel('eosio')
                    );
                } catch (e) {
                    expect(e.error.details[0].message).toContain(`missing authority of tonomy/owner`);
                }
            });

            test('sign with tonomy@owner with ops.tmy signer should fail', async () => {
                expect.assertions(1);

                try {
                    await getTonomyEosioProxyContract().deployContract('eosio', wasmFile, abiFile, tonomyOpsSigner, [
                        ownerPermissionLevel('tonomy'),
                        activePermissionLevel('eosio'),
                    ]);
                } catch (e) {
                    expect(e.error.details[0].message).toContain(
                        `transaction declares authority '{"actor":"tonomy","permission":"owner"}', but does not have signatures for it`
                    );
                }
            });

            test('sign with tonomy@owner with one board signer should fail', async () => {
                expect.assertions(1);

                try {
                    await getTonomyEosioProxyContract().deployContract(
                        'eosio',
                        wasmFile,
                        abiFile,
                        tonomyBoardSigners[0],
                        [ownerPermissionLevel('tonomy'), activePermissionLevel('eosio')]
                    );
                } catch (e) {
                    expect(e.error.details[0].message).toContain(
                        `transaction declares authority '{"actor":"eosio","permission":"active"}', but does not have signatures for it`
                    );
                }
            });

            test('sign with tonomy@owner with two board signers should fail', async () => {
                expect.assertions(1);

                try {
                    await getTonomyEosioProxyContract().deployContract(
                        'eosio',
                        wasmFile,
                        abiFile,
                        tonomyBoardSigners.slice(0, 2),
                        [ownerPermissionLevel('tonomy'), activePermissionLevel('eosio')]
                    );
                } catch (e) {
                    expect(e.error.details[0].message).toContain(
                        `transaction declares authority '{"actor":"eosio","permission":"active"}', but does not have signatures for it`
                    );
                }
            });

            test('sign with tonomy@owner with two board signers and Tonomy ops signer should succeed', async () => {
                expect.assertions(1);

                const trx = await getTonomyEosioProxyContract().deployContract(
                    'eosio',
                    wasmFile,
                    abiFile,
                    [...tonomyBoardSigners.slice(0, 2), tonomyOpsSigner],
                    [ownerPermissionLevel('tonomy'), activePermissionLevel('eosio')]
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
            test('using eosio contract, sign with tonomy@owner with two board signers should succeed', async () => {
                expect.assertions(2);
                const trx = await getEosioContract().deployContract(
                    'tonomy',
                    wasmFile,
                    abiFile,
                    tonomyBoardSigners.slice(0, 2),
                    [ownerPermissionLevel('tonomy'), activePermissionLevel('tonomy')]
                );

                expect(trx.processed.receipt.status).toBe('executed');
                await restoreTonomyContract();
            });

            test('using tonomy contract, sign with tonomy@owner with two board signers should succeed', async () => {
                expect.assertions(2);
                await sleep(1000);
                const trx = await getTonomyEosioProxyContract().deployContract(
                    'tonomy',
                    wasmFile,
                    abiFile,
                    tonomyBoardSigners.slice(0, 2),
                    [ownerPermissionLevel('tonomy'), activePermissionLevel('tonomy')]
                );

                expect(trx.processed.receipt.status).toBe('executed');
                await restoreTonomyContract();
            });
        });

        async function restoreEosioTonomyContract() {
            // Deploy eosio.tonomy contract back in place
            const { wasmFile, abiFile } = getDeployableFiles('eosio.tonomy');

            await getTonomyEosioProxyContract().deployContract('eosio', wasmFile, abiFile, [
                ...tonomyBoardSigners.slice(0, 2),
                tonomyOpsSigner,
            ]);
        }

        async function restoreTonomyContract() {
            // Deploy tonomy contract back in place
            const { wasmFile, abiFile } = getDeployableFiles('tonomy');

            const transaction = await getEosioContract().deployContract('tonomy', wasmFile, abiFile, [
                ...tonomyBoardSigners.slice(0, 2),
            ]);

            expect(transaction.processed.receipt.status).toBe('executed');
        }
    });
});
