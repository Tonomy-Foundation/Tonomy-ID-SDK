import { Name } from "@greymass/eosio"
import { Authority } from '../eosio/authority';
import { Signer, transact } from "../eosio/transaction";

class IDContract {
    static _singleton_instance: IDContract;

    public static get Instance() {
        return this._singleton_instance || (this._singleton_instance = new this());
    }

    async newperson(username_hash: string,
        password_key: string,
        password_salt: string,
        signer: Signer
    ) {
        console.log("IDContract.newperson()");

        const action = {
            authorization: [
                {
                    actor: "id.tonomy",
                    permission: 'active',
                },
            ],
            account: 'id.tonomy',
            name: 'newperson',
            data: {
                username_hash,
                password_key,
                password_salt,
            }
        }

        return await transact(Name.from("id.tonomy"), [action], signer);
    }

    async updateperson(account: string,
        permission: string,
        parent: string,
        key: string,
        signer: Signer
    ) {
        console.log("IDContract.updateperson()");
        const action = {
            authorization: [
                {
                    actor: account,
                    permission: parent,
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
        signer: Signer
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