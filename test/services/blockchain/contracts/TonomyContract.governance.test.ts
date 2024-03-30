import { ABI, KeyType, Name, PrivateKey, Serializer } from '@wharfkit/antelope';
import { EosioMsigContract, Authority } from '../../../../src/sdk/index';
import {
    ActionData,
    TonomyEosioProxyContract,
    createSigner,
    getTonomyOperationsKey,
    transact,
} from '../../../../src/sdk/services/blockchain';
import { setTestSettings } from '../../../helpers/settings';
import { getDeployableFilesFromDir } from '../../../../src/cli/bootstrap/deploy-contract';
import fs from 'fs';

setTestSettings();

const tonomyBoardKeys = [
    'PVT_K1_YUpMM1hPec78763ADBMK3gJ4N3yUFi3N8dKRQ3nyYcxqoDnmL',
    'PVT_K1_2BvbQ8rQ55eTtUqaohjKZViUCupsDtbwhUsEmn3dTaZymAdXKp',
    'PVT_K1_2KjVtHQaBXydUidyoEdjbLw44DZBaQbFdNB6GmQHPzoXQqsTyp',
];

const tonomyBoardPrivateKeys = tonomyBoardKeys.map((key) => PrivateKey.from(key));
const tonomyBoardSigners = tonomyBoardPrivateKeys.map((key) => createSigner(key));

const eosioMsigContract = EosioMsigContract.Instance;
const tonomyEosioProxyContract = TonomyEosioProxyContract.Instance;

function randomAccountName(): string {
    // replace all digits 06789 with another random digit
    return ('test' + Math.floor(Math.random() * 100000000)).replace(/[06789]/g, (x) =>
        Math.ceil(Math.random() * 5).toString()
    );
}

describe('TonomyContract class', () => {
    const tonomyOpsSigner = createSigner(getTonomyOperationsKey());

    jest.setTimeout(60000);

    describe('native::newaccount()', () => {
        // require_governance_owner()

        let key: PrivateKey;
        let authority: Authority;
        let action: ActionData;
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
                await transact(Name.from('tonomy'), [action], tonomyOpsSigner);
            } catch (e) {
                expect(e.error.details[0].message).toBe('missing authority of tonomy/owner');
            }
        });

        test('sign with tonomy@owner with 1 key should fail', async () => {
            expect.assertions(1);

            try {
                await transact(Name.from('tonomy'), [action], tonomyBoardSigners[0]);
            } catch (e) {
                expect(e.error.details[0].message).toContain('but does not have signatures for it');
            }
        });

        test('sign with tonomy@owner with 2 keys should succeed', async () => {
            expect.assertions(1);
            const trx = await transact(Name.from('tonomy'), [action], [tonomyBoardSigners[0], tonomyBoardSigners[1]]);

            expect(trx.processed.receipt.status).toBe('executed');
        });

        test('sign with tonomy@owner with 2 keys using eosio.msig should succeed', async () => {
            try {
                await msigAction([action], { satisfyRequireApproval: true });
            } catch (e) {
                console.log(e.message, JSON.stringify(e, null, 2));
                throw e;
            }
        });

        test('sign with tonomy@owner with 1 keys using eosio.msig should fail', async () => {
            try {
                await msigAction([action]);
            } catch (e) {
                console.log(e.message, JSON.stringify(e, null, 2));
                throw e;
            }
        });

        test('sign with random@owner with board should succeed', async () => {
            expect.assertions(1);
            await transact(Name.from('tonomy'), [action], [tonomyBoardSigners[0], tonomyBoardSigners[1]]);

            // Setup next account to create, signed by the new account
            action.data.creator = randomName;
            action.data.name = randomAccountName();
            action.authorization.push({ actor: randomName, permission: 'active' });
            const randomAccountSigner = createSigner(key);

            const trx = await transact(
                Name.from('tonomy'),
                [action],
                [randomAccountSigner, tonomyBoardSigners[0], tonomyBoardSigners[1]]
            );

            expect(trx.processed.receipt.status).toBe('executed');
        });

        test('sign with random@owner without board should fail', async () => {
            expect.assertions(1);
            await transact(Name.from('tonomy'), [action], [tonomyBoardSigners[0], tonomyBoardSigners[1]]);

            // Setup next account to create, signed by the new account
            action.data.creator = randomName;
            action.data.name = randomAccountName();
            action.authorization = [{ actor: randomName, permission: 'active' }];
            const randomAccountSigner = createSigner(key);

            try {
                await transact(Name.from('tonomy'), [action], [randomAccountSigner]);
            } catch (e) {
                expect(e.error.details[0].message).toBe('missing authority of tonomy/owner');
            }
        });
    });

    describe('native::updateauth()', () => {
        // special_governance_check()
        let key: PrivateKey;
        let authority: Authority;
        let action: ActionData;
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
                    auth_parent: true,
                },
            };
        });

        test('update eosio auth: sign with tonomy@owner should succeed', async () => {
            expect.assertions(1);

            try {
                const trx = await transact(
                    Name.from('tonomy'),
                    [action],
                    [tonomyBoardSigners[0], tonomyBoardSigners[1]]
                );

                expect(trx.processed.receipt.status).toBe('executed');
            } catch (e) {
                console.log(e.message, JSON.stringify(e, null, 2));
                throw e;
            }
        });

        test('update eosio auth: sign with tonomy@owner with only one board key should fail', async () => {
            expect.assertions(1);

            try {
                await transact(Name.from('tonomy'), [action], [tonomyBoardSigners[0]]);
            } catch (e) {
                expect(e.error.details[0].message).toContain('but does not have signatures for it');
            }
        });

        test('update eosio auth: sign with tonomy@active should fail', async () => {
            expect.assertions(1);

            try {
                await transact(Name.from('tonomy'), [action], [tonomyOpsSigner]);
            } catch (e) {
                expect(e.error.details[0].message).toContain('but does not have signatures for it');
            }
        });

        test('update eosio auth: sign with tonomy@owner should succeed', async () => {
            expect.assertions(1);

            try {
                action.authorization = [{ actor: 'tonomy', permission: 'owner' }];
                const trx = await transact(
                    Name.from('tonomy'),
                    [action],
                    [tonomyBoardSigners[0], tonomyBoardSigners[1]]
                );

                expect(trx.processed.receipt.status).toBe('executed');
            } catch (e) {
                console.log(e.message, JSON.stringify(e, null, 2));
                throw e;
            }
        });

        test('update eosio auth: sign with tonomy@owner using eosio.msig 2 keys should succeed', async () => {
            expect.assertions(3);

            try {
                await msigAction([action], { satisfyRequireApproval: true });
            } catch (e) {
                console.log(e.message, JSON.stringify(e, null, 2));
                throw e;
            }
        });

        test('update eosio auth: sign with tonomy@owner using eosio.msig 1 keys should fail', async () => {
            expect.assertions(3);

            try {
                await msigAction([action]);
            } catch (e) {
                console.log(e.message, JSON.stringify(e, null, 2));
                throw e;
            }
        });
    });

    describe('native::setcode()', () => {
        // special_governance_check() + eosio.tonomy special checks
        let key: PrivateKey;
        let authority: Authority;
        let createAccountAction: ActionData;
        let newAccount: string;
        let actions: ActionData[];

        const { wasmPath, abiPath } = getDeployableFilesFromDir('./Tonomy-Contracts/contracts/eosio.bios');
        const wasmFile = fs.readFileSync(wasmPath);
        const abiFile = fs.readFileSync(abiPath, 'utf8');

        beforeEach(() => {
            key = PrivateKey.generate(KeyType.K1);
            authority = Authority.fromKey(key.toPublic().toString());
            newAccount = randomAccountName();

            createAccountAction = {
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
            };

            // 1. Prepare SETCODE
            // read the file and make a hex string out of it
            const wasm = wasmFile.toString(`hex`);

            // 2. Prepare SETABI
            const abi = JSON.parse(abiFile);
            const abiDef = ABI.from(abi);
            const abiSerializedHex = Serializer.encode({ object: abiDef }).hexString;

            // 3. Send transaction with both setcode and setabi actions
            const setCodeAction = {
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
            };

            const setAbiAction = {
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
            };

            actions = [setCodeAction, setAbiAction];
        });

        test('create new account and deploy contract: sign with tonomy@active and newaccount keys should succeed', async () => {
            expect.assertions(1);

            await transact(Name.from('tonomy'), [createAccountAction], [tonomyBoardSigners[0], tonomyBoardSigners[1]]);

            const trx = await tonomyEosioProxyContract.deployContract(
                Name.from(newAccount),
                wasmFile,
                abiFile,
                [createSigner(key), tonomyOpsSigner],
                { extraAuthorization: { actor: 'tonomy', permission: 'active' } }
            );

            expect(trx.processed.receipt.status).toBe('executed');
        });

        test('create new account and deploy contract: sign with tonomy@active key should fail', async () => {
            expect.assertions(1);

            try {
                await transact(
                    Name.from('tonomy'),
                    [createAccountAction],
                    [tonomyBoardSigners[0], tonomyBoardSigners[1]]
                );

                await tonomyEosioProxyContract.deployContract(
                    Name.from(newAccount),
                    wasmFile,
                    abiFile,
                    [tonomyOpsSigner],
                    { extraAuthorization: { actor: 'tonomy', permission: 'active' } }
                );
            } catch (e) {
                expect(e.error.details[0].message).toContain('but does not have signatures for it');
            }
        });

        test('create new account and deploy contract: sign with newaccount key should fail', async () => {
            expect.assertions(1);

            try {
                await transact(
                    Name.from('tonomy'),
                    [createAccountAction],
                    [tonomyBoardSigners[0], tonomyBoardSigners[1]]
                );

                await tonomyEosioProxyContract.deployContract(Name.from(newAccount), wasmFile, abiFile, [
                    createSigner(key),
                ]);
            } catch (e) {
                expect(e.error.details[0].message).toContain(`missing authority of tonomy/active`);
            }
        });

        test('deploy eosio contract (special): sign with tonomy@active key should fail', async () => {
            expect.assertions(1);

            try {
                await tonomyEosioProxyContract.deployContract(Name.from('eosio'), wasmFile, abiFile, [tonomyOpsSigner]);
            } catch (e) {
                expect(e.error.details[0].message).toContain(`missing authority of tonomy/owner`);
            }
        });

        test('deploy eosio contract (special): sign with tonomy@owner but without correct signer should fail', async () => {
            expect.assertions(1);

            try {
                await tonomyEosioProxyContract.deployContract(
                    Name.from('eosio'),
                    wasmFile,
                    abiFile,
                    [tonomyOpsSigner],
                    { extraAuthorization: { actor: 'tonomy', permission: 'owner' } }
                );
            } catch (e) {
                expect(e.error.details[0].message).toContain(`but does not have signatures for it`);
            }
        });

        test('deploy eosio contract (special): sign with tonomy@owner but only one board signer should fail', async () => {
            expect.assertions(1);

            try {
                await tonomyEosioProxyContract.deployContract(
                    Name.from('eosio'),
                    wasmFile,
                    abiFile,
                    [tonomyBoardSigners[0]],
                    { extraAuthorization: { actor: 'tonomy', permission: 'owner' } }
                );
            } catch (e) {
                expect(e.error.details[0].message).toContain(`but does not have signatures for it`);
            }
        });

        test('deploy eosio contract (special): sign with tonomy@owner with two board signers should succeed', async () => {
            expect.assertions(1);

            const trx = await tonomyEosioProxyContract.deployContract(
                Name.from('eosio'),
                wasmFile,
                abiFile,
                [tonomyBoardSigners[0], tonomyBoardSigners[1]],
                { extraAuthorization: { actor: 'tonomy', permission: 'owner' } }
            );

            expect(trx.processed.receipt.status).toBe('executed');

            await restoreEosioTonomyContract();
        });

        test('deploy eosio contract (special): sign with tonomy@owner with two board signers and Tonomy ops signer should succeed', async () => {
            expect.assertions(1);

            const trx = await tonomyEosioProxyContract.deployContract(
                Name.from('eosio'),
                wasmFile,
                abiFile,
                [tonomyBoardSigners[0], tonomyBoardSigners[1], tonomyOpsSigner],
                { extraAuthorization: { actor: 'tonomy', permission: 'owner' } }
            );

            expect(trx.processed.receipt.status).toBe('executed');

            await restoreEosioTonomyContract();
        });

        test('deploy eosio contract (special): sign with tonomy@owner with eosio.msig and two board should succeed', async () => {
            expect.assertions(3);

            await msigAction(actions, { satisfyRequireApproval: true, requireTonomyOps: true });

            await restoreEosioTonomyContract();
        });

        test('deploy eosio contract (special): sign with tonomy@owner with eosio.msig but only one board + tonomy ops signers should fail', async () => {
            expect.assertions(3);

            await msigAction(actions, { requireTonomyOps: true });
        });

        async function restoreEosioTonomyContract() {
            // Deploy eosio.tonomy contract back in place
            const { wasmPath, abiPath } = getDeployableFilesFromDir('./Tonomy-Contracts/contracts/eosio.tonomy');
            const wasmFile = fs.readFileSync(wasmPath);
            const abiFile = fs.readFileSync(abiPath, 'utf8');

            await tonomyEosioProxyContract.deployContract(
                Name.from('eosio'),
                wasmFile,
                abiFile,
                [tonomyBoardSigners[0], tonomyBoardSigners[1], tonomyOpsSigner],
                { extraAuthorization: { actor: 'tonomy', permission: 'owner' } }
            );
        }
    });

    // asserts = 3
    async function msigAction(
        actions: ActionData[],
        options: { satisfyRequireApproval?: boolean; requireTonomyOps?: boolean } = {}
    ) {
        const proposalName = randomAccountName();
        const proposer = '1.found.tmy';

        const requested = [
            {
                actor: '1.found.tmy',
                permission: 'owner',
            },
            {
                actor: '2.found.tmy',
                permission: 'owner',
            },
            {
                actor: '3.found.tmy',
                permission: 'owner',
            },
        ];

        if (options.requireTonomyOps ?? false) {
            requested.push({
                actor: 'tonomy',
                permission: 'active',
            });
        }

        const { proposalHash, transaction } = await eosioMsigContract.propose(
            proposer,
            proposalName,
            requested,
            actions,
            tonomyBoardSigners[0]
        );

        expect(transaction.processed.receipt.status).toBe('executed');

        const approve1Trx = await eosioMsigContract.approve(
            proposer,
            proposalName,
            {
                actor: Name.from('1.found.tmy'),
                permission: Name.from('owner'),
            },
            proposalHash,
            tonomyBoardSigners[0]
        );

        expect(approve1Trx.processed.receipt.status).toBe('executed');

        if (options.satisfyRequireApproval ?? false) {
            await eosioMsigContract.approve(
                proposer,
                proposalName,
                {
                    actor: Name.from('2.found.tmy'),
                    permission: Name.from('owner'),
                },
                proposalHash,
                tonomyBoardSigners[1]
            );
        }

        if (options.requireTonomyOps ?? false) {
            await eosioMsigContract.approve(
                proposer,
                proposalName,
                {
                    actor: Name.from('tonomy'),
                    permission: Name.from('active'),
                },
                proposalHash,
                tonomyOpsSigner
            );
        }

        try {
            const execTrx = await eosioMsigContract.exec(proposer, proposalName, '1.found.tmy', tonomyBoardSigners[0]);

            if (options.satisfyRequireApproval ?? false) {
                expect(execTrx.processed.receipt.status).toBe('executed');
            }
        } catch (e) {
            if (!(options.satisfyRequireApproval ?? false)) {
                expect(e.error.details[0].message).toContain('transaction authorization failed');
            } else {
                throw e;
            }
        }
    }
});
