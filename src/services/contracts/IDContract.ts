import { API, Checksum256, Name } from "@greymass/eosio"
import { sha256 } from "../../util/crypto";
import { api } from "../eosio/eosio";
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

type GetAccountTonomyIDInfoResponse = {
    account_name: Name,
    type: Number,
    status: Number,
    username_hash: Checksum256,
    password_salt: Checksum256
};

class IDContract {
    static _singleton_instance: IDContract;

    public static get Instance() {
        return this._singleton_instance || (this._singleton_instance = new this());
    }

    async newperson(username_hash: string,
        password_key: string,
        password_salt: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
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
    ): Promise<API.v1.PushTransactionResponse> {
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

    async getAccountTonomyIDInfo(account: string | Name): Promise<GetAccountTonomyIDInfoResponse> {
        let data;
        if (typeof account === 'string') {
            // this is a username
            const usernameHash = Checksum256.from(sha256(account));

            data = await api.v1.chain.get_table_rows({
                code: "id.tonomy",
                table: "accounts",
                lower_bound: usernameHash,
                index_position: "secondary"
            });
        } else {
            // use the account name directly
            data = await api.v1.chain.get_table_rows({
                code: "id.tonomy",
                table: "accounts",
                lower_bound: Name.from(account)
            });
        }
        if (data.rows.length === 0) throw new Error("Account not found");
        return data.rows[0];
    }
}

export { IDContract, GetAccountTonomyIDInfoResponse };