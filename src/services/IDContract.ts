import { Action, Checksum256, Name, PublicKey } from "@greymass/eosio"
import { api, privateKey } from './eosio';
import { transact } from "./transaction";

// wrapper class that has js interface to call the smart contract
class IDContract {
    private static _instance: IDContract;

    // calls the ID smart contract create() function to create the account
    async newperson(creator: string,
        username_hash: string,
        password: string,
        salt: string,
        pin: string,
        fingerprint: string
    ) {
        console.log("IDContract.newperson()");
        const newpersonAction = {
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

        const res = await transact(Name.from("id.tonomy"), [newpersonAction], privateKey.signDigest,)
        console.log(JSON.stringify(res, null, 2));
        // calls transaction with id::newperson and 2x id::updatekey
        // creates the new account with the public key and account name,
        // and stores the salt on chain for later user to re-derive the private key with the password
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