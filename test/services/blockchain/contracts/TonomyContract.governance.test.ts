import { KeyType, Name, PrivateKey } from '@wharfkit/antelope';
import { EosioMsigContract, Authority } from '../../../../src/sdk/index';
import { ActionData, createSigner, getTonomyOperationsKey, transact } from '../../../../src/sdk/services/blockchain';
import { setTestSettings } from '../../../helpers/settings';

setTestSettings();

const tonomyBoardKeys = [
    'PVT_K1_YUpMM1hPec78763ADBMK3gJ4N3yUFi3N8dKRQ3nyYcxqoDnmL',
    'PVT_K1_2BvbQ8rQ55eTtUqaohjKZViUCupsDtbwhUsEmn3dTaZymAdXKp',
    'PVT_K1_2KjVtHQaBXydUidyoEdjbLw44DZBaQbFdNB6GmQHPzoXQqsTyp',
];

const tonomyBoardPrivateKeys = tonomyBoardKeys.map((key) => PrivateKey.from(key));
const tonomyBoardSigners = tonomyBoardPrivateKeys.map((key) => createSigner(key));

const eosioMsigContract = EosioMsigContract.Instance;

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
            expect.assertions(1);

            const trx = await eosioMsigContract.propose(
                '1.found.tmy',
                randomAccountName(),
                [
                    {
                        actor: 'tonomy',
                        permission: 'owner',
                    },
                ],
                [action],
                tonomyBoardSigners[0]
            );

            expect(trx.processed.receipt.status).toBe('executed');
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

    // describe('native::updateauth()', () => {
    //     // special_governance_check()
    //     test('', async () => { });
    // });

    // describe('native::setcode()', () => {
    //     // special_governance_check() + eosio.tonomy special checks
    //     test('', async () => { });
    // });

    // describe('native::setalimits()', () => {
    //     //require_governance_owner
    //     test('', async () => { });
    // });
});
