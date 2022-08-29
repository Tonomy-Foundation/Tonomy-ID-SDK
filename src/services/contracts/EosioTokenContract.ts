import { Name } from "@greymass/eosio"
import { Signer, transact } from "../eosio/transaction";

class EosioTokenContract {
    static _singleton_instance: EosioTokenContract;

    public static get Instance() {
        return this._singleton_instance || (this._singleton_instance = new this());
    }

    async create(supply: string, signer: Signer): Promise<void> {
        console.log("EosioTokenContract.create()");

        const actions = [
            {
                account: "eosio.token",
                name: "create",
                authorization: [
                    {
                        actor: "eosio.token",
                        permission: 'active',
                    },
                ],
                data: {
                    issuer: "eosio.token",
                    maximum_supply: supply,
                },
            }
        ]

        return await transact(Name.from("eosio.token"), actions, signer);
    }

    async issue(quantity: string, signer: Signer): Promise<void> {
        console.log("EosioTokenContract.issue()");

        const actions = [{
            account: "eosio.token",
            name: "issue",
            authorization: [
                {
                    actor: "eosio.token",
                    permission: 'active',
                },
            ],
            data: {
                to: "eosio.token",
                quantity,
                memo: ""
            },
        }
        ]

        return await transact(Name.from("eosio.token"), actions, signer);
    }
}

export { EosioTokenContract };