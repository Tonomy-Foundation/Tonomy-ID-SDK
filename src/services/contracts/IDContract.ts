import { Name } from "@greymass/eosio"
import { Authority } from '../eosio/authority';
import { Signer, transact } from "../eosio/transaction";

enum enum_permission_level {
    Owner,
    Active,
    Password,
    Pin,
    Fingerprint,
    Local
}

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

    async updatekeys(account: string,
        keys: {
            fingerprint?: string,
            pin?: string,
            local?: string,
        },
        signer: Signer
    ) {
        console.log("IDContract.updatekeys()");
        const actions = [];
        for (const key in keys) {
            let permission;
            switch (key) {
                case "fingerprint":
                    permission = enum_permission_level.Fingerprint;
                    break;
                case "pin":
                    permission = enum_permission_level.Pin;
                    break;
                case "local":
                    permission = enum_permission_level.Local;
                    break;
                default:
                    throw new Error("Invalid key");
            }
            actions.push({
                authorization: [
                    {
                        actor: account,
                        permission: "owner",
                    }
                ],
                account: 'id.tonomy',
                name: 'updatekey',
                data: {
                    account,
                    permission,
                    key: keys[key],
                },
            });
        }

        return await transact(Name.from("id.tonomy"), actions, signer);
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