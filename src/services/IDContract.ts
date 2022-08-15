import { Checksum256, Name } from "@greymass/eosio"
import { api, privateKey } from './eosio/eosio';
import { createKeyAuthoriy } from './eosio/authority';
import { transact } from "./eosio/transaction";

const signer = {
    sign(digest: Checksum256) {
        return privateKey.signDigest(digest);
    }
}


// wrapper class that has js interface to call the smart contract
class IDContract {
    private static _instance: IDContract;

    async newperson(creator: string,
        username_hash: string,
        password: string,
        salt: string,
        pin: string,
        fingerprint: string
    ) {
        console.log("IDContract.newperson()");
        const action = {
            authorization: [
                {
                    actor: 'id.tonomy',
                    permission: 'active',
                },
            ],
            account: 'id.tonomy',
            name: 'newperson',
            data: {
                creator,
                username_hash,
                password,
                salt,
                pin,
                fingerprint
            },
        }

        const res = await transact(Name.from("id.tonomy"), [action], signer,)
        console.log(JSON.stringify(res, null, 2));
        return res;
    }

    async updateperson(account: string,
        permission: string,
        parent: string,
        key: string
    ) {
        console.log("IDContract.updateperson()");
        const action = {
            authorization: [
                // {
                //     actor: account,
                //     permission: permission,
                // },
                // {
                //     actor: "id.tonomy",
                //     permission: permission,
                // },
                // {
                //     actor: "id.tonomy",
                //     permission: permission,
                // },
                {
                    actor: account,
                    permission: parent,
                },
            ],
            account: 'id.tonomy',
            name: 'updateperson',
            data: {
                account,
                permission,
                parent,
                key,
            },
        }

        const res = await transact(Name.from("id.tonomy"), [action], signer,)
        console.log(JSON.stringify(res, null, 2));
        return res;
    }

    async updateauth(account: string,
        permission: string,
        parent: string,
        key: string
    ) {
        console.log("IDContract.updateauth()");
        console.log(account, permission, parent, key);

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
                auth: createKeyAuthoriy(key),
            },
        }

        const res = await transact(Name.from("eosio"), [action], signer,)
        console.log(JSON.stringify(res, null, 2));
        return res;
    }

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }
}

export { IDContract }