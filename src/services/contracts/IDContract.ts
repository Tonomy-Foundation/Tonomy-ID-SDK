import { API, Checksum256, Name } from "@greymass/eosio"
import { sha256 } from "../../util/crypto";
import { api } from "../eosio/eosio";
import { Signer, transact } from "../eosio/transaction";

enum enum_permission_level {
    Owner,
    Active,
    Password,
    Pin,
    Fingerprint,
    Local
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
            fingerprint?: string,
            pin?: string,
            local?: string,
        },
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
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

    async getAccountTonomyIDInfo(account: string | Name): Promise<GetAccountTonomyIDInfoResponse> {
        let data;
        if (typeof account === 'string') {
            // this is a username
            const accountName = sha256(account);

            data = await api.v1.chain.get_table_rows({
                code: "id.tonomy",
                table: "accounts",
                lower_bound: Name.from(accountName),
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
        return data.rows[0];
    }
}

export { IDContract, GetAccountTonomyIDInfoResponse };