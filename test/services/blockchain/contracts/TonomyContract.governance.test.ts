import { KeyType, Name, PrivateKey } from '@wharfkit/antelope';
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
                await msigAction(action, true);
            } catch (e) {
                console.log(e.message, JSON.stringify(e, null, 2));
                throw e;
            }
        });

        test('sign with tonomy@owner with 1 keys using eosio.msig should fail', async () => {
            try {
                await msigAction(action, false);
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
                await msigAction(action, true);
            } catch (e) {
                console.log(e.message, JSON.stringify(e, null, 2));
                throw e;
            }
        });

        test('update eosio auth: sign with tonomy@owner using eosio.msig 1 keys should fail', async () => {
            expect.assertions(3);

            try {
                await msigAction(action, false);
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
        });

        test('create new account and deploy contract: sign with tonomy@active and newaccount keys should succeed', async () => {
            expect.assertions(1);

            try {
                await transact(
                    Name.from('tonomy'),
                    [createAccountAction],
                    [tonomyBoardSigners[0], tonomyBoardSigners[1]]
                );

                const trx = await tonomyEosioProxyContract.deployContract(
                    Name.from(newAccount),
                    wasmFile,
                    abiFile,
                    [createSigner(key), tonomyOpsSigner],
                    { extraAuthorization: { actor: 'tonomy', permission: 'active' } }
                );

                expect(trx.processed.receipt.status).toBe('executed');
            } catch (e) {
                console.log(e.message, JSON.stringify(e, null, 2));
                throw e;
            }
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

        test('create new account and deploy contract: sign with tonomy@active and newaccount keys should succeed', async () => {
            expect.assertions(1);

            try {
                const trx = await tonomyEosioProxyContract.deployContract(
                    Name.from('eosio'),
                    wasmFile,
                    abiFile,
                    [tonomyOpsSigner]
                    // { extraAuthorization: { actor: 'tonomy', permission: 'active' } }
                );

                expect(trx.processed.receipt.status).toBe('executed');
            } catch (e) {
                console.log(e.message, JSON.stringify(e, null, 2));
                throw e;
            }
        });
    });
});

// asserts = 3
async function msigAction(action: ActionData, satisfyRequireApproval = false) {
    const proposalName = randomAccountName();
    const proposer = '1.found.tmy';

    const { proposalHash, transaction } = await eosioMsigContract.propose(
        proposer,
        proposalName,
        [
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
        ],
        [action],
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

    if (satisfyRequireApproval) {
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

    try {
        const execTrx = await eosioMsigContract.exec(proposer, proposalName, '1.found.tmy', tonomyBoardSigners[0]);

        if (satisfyRequireApproval) {
            expect(execTrx.processed.receipt.status).toBe('executed');
        }
    } catch (e) {
        if (!satisfyRequireApproval) {
            expect(e.error.details[0].message).toContain('transaction authorization failed');
        } else {
            throw e;
        }
    }
}
