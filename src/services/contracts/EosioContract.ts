/* eslint-disable camelcase */
import { ABI, API, Name, Serializer } from '@greymass/eosio';
import { Authority } from '../eosio/authority';
import { Signer, transact } from '../eosio/transaction';

class EosioContract {
    static singletonInstance: EosioContract;

    public static get Instance() {
        return this.singletonInstance || (this.singletonInstance = new this());
    }

    /**
     * Deploys a contract at the specified address
     *
     * @param account - Account where the contract will be deployed
     * @param wasmFileContents - wasmFile after reading with fs.readFileSync(path) or equivalent
     * @param abiFileContents - abiFile after reading with fs.readFileSync(path, `utf8`) or equivalent
     */
    async deployContract(
        account: Name,
        wasmFileContent: any,
        abiFileContent: any,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        // 1. Prepare SETCODE
        // read the file and make a hex string out of it
        const wasm = wasmFileContent.toString(`hex`);

        // 2. Prepare SETABI
        const abi = JSON.parse(abiFileContent);
        const abiDef = ABI.from(abi);
        const abiSerializedHex = Serializer.encode({ object: abiDef }).hexString;

        // 3. Send transaction with both setcode and setabi actions
        const setcodeAction = {
            account: 'eosio',
            name: 'setcode',
            authorization: [
                {
                    actor: account.toString(),
                    permission: 'active',
                },
            ],
            data: {
                account: account.toString(),
                vmtype: 0,
                vmversion: 0,
                code: wasm,
            },
        };
        const setabiAction = {
            account: 'eosio',
            name: 'setabi',
            authorization: [
                {
                    actor: account.toString(),
                    permission: 'active',
                },
            ],
            data: {
                account,
                abi: abiSerializedHex,
            },
        };
        const actions = [setcodeAction, setabiAction];

        return await transact(Name.from('eosio'), actions, signer);
    }

    async newaccount(
        creator: string,
        account: string,
        owner: Authority,
        active: Authority,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: creator,
                    permission: 'active',
                },
            ],
            account: 'eosio',
            name: 'newaccount',
            data: {
                creator,
                name: account,
                owner,
                active,
            },
        };

        return await transact(Name.from('eosio'), [action], signer);
    }

    async updateauth(
        account: string,
        permission: string,
        parent: string,
        auth: Authority,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: account,
                    permission: parent, // both parent and permission work as authorization. though permission is supposed to be the authorization that works
                },
            ],
            account: 'eosio',
            name: 'updateauth',
            data: {
                account,
                permission,
                parent,
                auth,
            },
        };

        return await transact(Name.from('eosio'), [action], signer);
    }
}

export { EosioContract };
