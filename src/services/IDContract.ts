import { Checksum256, Name } from "@greymass/eosio"
import { api, privateKey, createKeyAuthoriy } from './eosio';
import { transact } from "./transaction";

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

async function callnewperson() {
    console.log(`Calling id.tonomy::newperson`)

    try {
        const result = await api.v1.chain.push_transaction(
            {
                actions: [
                    {
                        account: "id.tonomy",
                        name: "newperson",
                        authorization: [
                            {
                                actor: "id.tonomy",
                                permission: 'active',
                            },
                        ],
                        data: {
                            creator: "id.tonomy",
                            username_hash: "7d32c90f59b2131f86132a30172a8adbb3e839110e38874901afc61d971d7d0e",
                            password: publicKey.toString(),
                            salt: "b9776d7ddf459c9ad5b0e1d6ac61e27befb5e99fd62446677600d7cacef544d0",
                            pin: publicKey.toString(),
                            fingerprint: publicKey.toString()
                        },
                    }
                ],
            },
            {
                blocksBehind: 3,
                expireSeconds: 30,
            }
        )
        return result;
    } catch (error) {
        console.log(JSON.stringify(error, null, 2))
        throw error;
    }
}


export { IDContract }