import { Name } from "@greymass/eosio"
import { signer } from '../eosio/eosio';
import { Authority } from '../eosio/authority';
import { transact } from "../eosio/transaction";

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
                    actor: creator,
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
            }
        }

        return await transact(Name.from("id.tonomy"), [action], signer);
    }

    async updateperson(account: string,
        permission: string,
        parent: string,
        key: string
    ) {
        console.log("IDContract.updateperson()");
        const action = {
            authorization: [
                {
                    actor: account,
                    permission: permission,
                }
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

        return await transact(Name.from("id.tonomy"), [action], signer);
    }

    async updateauth(account: string,
        permission: string,
        parent: string,
        auth: Authority,
    ) {
        console.log("IDContract.updateauth()");
        console.log(account, permission, parent, auth);

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

export { IDContract };