import { ABI, Name, Serializer } from "@greymass/eosio"
import { Authority } from "../eosio/authority";
import { signer } from '../eosio/eosio';
import { transact } from "../eosio/transaction";

class EosioContract {
    static _singleton_instance: EosioContract;

    public static get Instance() {
        return this._singleton_instance || (this._singleton_instance = new this());
    }

    /**
     * Deploys a contract at the specified address
     *
     * @param account - Account where the contract will be deployed
     * @param wasmFileContents - wasmFile after reading with fs.readFileSync(path) or equivalent
     * @param abiFileContents - abiFile after reading with fs.readFileSync(path, `utf8`) or equivalent
     */
    async deployContract(account: Name, wasmFileContent: any, abiFileContent: any) {
        // 1. Prepare SETCODE
        // read the file and make a hex string out of it
        const wasm = wasmFileContent.toString(`hex`);

        // 2. Prepare SETABI
        const abi = JSON.parse(abiFileContent)
        const abiDef = ABI.from(abi);
        const abiSerializedHex = Serializer.encode({ object: abiDef }).hexString;

        // 3. Send transaction with both setcode and setabi actions
        console.log(`Deploying contract to ${account}`);
        const actions = [
            {
                account: 'eosio',
                name: 'setcode',
                authorization: [
                    {
                        actor: account,
                        permission: 'active',
                    },
                ],
                data: {
                    account: account,
                    vmtype: 0,
                    vmversion: 0,
                    code: wasm,
                },
            },
            {
                account: 'eosio',
                name: 'setabi',
                authorization: [
                    {
                        actor: account,
                        permission: 'active',
                    },
                ],
                data: {
                    account: account,
                    abi: abiSerializedHex,
                },
            },
        ]
        await transact(Name.from("eosio"), actions, signer);
    }

    async newaccount(creator: string, account: string, owner: Authority, active: Authority) {
        console.log("EosioContract.newaccount()");

        const action = {
            authorization: [
                {
                    actor: creator,
                    permission: "active",
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
        }

        return await transact(Name.from("eosio"), [action], signer);
    }

    async updateauth(account: string,
        permission: string,
        parent: string,
        auth: Authority
    ) {
        console.log("EosioContract.updateauth()");

        const action = {
            authorization: [
                {
                    actor: account,
                    permission: parent,
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
        }

        return await transact(Name.from("eosio"), [action], signer);
    }
}

export { EosioContract };