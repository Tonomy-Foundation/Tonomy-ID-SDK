import { Name } from "@greymass/eosio"
import { Authority } from '../eosio/authority';
import { Signer, transact } from "../eosio/transaction";

enum PermissionLevel {
    OWNER = 'OWNER',
    ACTIVE = 'ACTIVE',
    PASSWORD = 'PASSWORD',
    PIN = 'PIN',
    FINGERPRINT = 'FINGERPRINT',
    LOCAL = 'LOCAL',
}

namespace PermissionLevel {
    /* 
     * Returns the index of the enum value
     * 
     * @param value The value to get the index of
     */
    export function indexFor(value: PermissionLevel): number {
        return Object.keys(PermissionLevel).indexOf(value);
    }

    /* 
     * Creates an PermissionLevel from a string or index of the level
     * 
     * @param value The string or index
     */
    export function from(value: number | string): PermissionLevel {
        let index: number
        if (typeof value !== 'number') {
            index = PermissionLevel.indexFor(value as PermissionLevel)
        } else {
            index = value
        }
        return Object.values(PermissionLevel)[index] as PermissionLevel;
    }
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
            FINGERPRINT?: string,
            PIN?: string,
            LOCAL?: string,
        },
        signer: Signer
    ) {
        console.log("IDContract.updatekeys()");

        const actions = [];
        for (const key in keys) {
            let permission = PermissionLevel.from(key);
            // "keys as any" fixes typescript issue see https://stackoverflow.com/a/57192972
            const publicKey = (keys as any)[key];

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
                    permission: PermissionLevel.indexFor(permission),
                    key: publicKey,
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