import { Name } from "@greymass/eosio"
import { signer } from './eosio/eosio';
import { createKeyAuthoriy } from './eosio/authority';
import { transact } from "./eosio/transaction";

class IDContract {
    static _singleton_instance: IDContract;

    public static get Instance() {
        return this._singleton_instance || (this._singleton_instance = new this());
    }

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
}

export { IDContract };