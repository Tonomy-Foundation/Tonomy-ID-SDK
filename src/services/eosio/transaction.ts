import { Action, API, Transaction, SignedTransaction, Signature, Checksum256, Name, PrivateKey } from "@greymass/eosio";
import { Authenticator, AuthenticatorLevel } from "../../authenticator";
import { api } from "./eosio";

type ActionData = {
    authorization: {
        actor: string;
        permission: string;
    }[],
    account?: string,
    name: string,
    data: any,
}

interface Signer {
    sign(digest: Checksum256): Promise<Signature>;
}

function createSigner(privateKey: PrivateKey): Signer {
    return {
        async sign(digest: Checksum256): Promise<Signature> {
            return privateKey.signDigest(digest);
        }
    }
}

function createAuthenticatorSigner(authenticator: Authenticator, level: AuthenticatorLevel): Signer {
    return {
        async sign(digest: Checksum256): Promise<Signature> {
            return await authenticator.signData({ level, data: digest.toString(), challenge: "THIS DOESNT WORK" }) as Signature;
        }
    }
}

async function transact(contract: Name, actions: ActionData[], signer: Signer): Promise<API.v1.PushTransactionResponse> {
    // Get the ABI
    const abi = await api.v1.chain.get_abi(contract);

    // Create the action data
    const actionData: Action[] = [];
    actions.forEach((data) => {
        actionData.push(Action.from({ ...data, account: contract }, abi.abi));
    })

    // Construct the transaction
    const info = await api.v1.chain.get_info();
    const header = info.getTransactionHeader();
    const transaction = Transaction.from({
        ...header,
        actions: actionData,
    });

    // Create signature
    const signDigest = transaction.signingDigest(info.chain_id);
    const signature = await signer.sign(signDigest);
    // console.log(JSON.stringify({ actions, transaction, signature }, null, 2));
    const signedTransaction = SignedTransaction.from({
        ...transaction,
        signatures: [signature],
    });

    // Send to the node
    let res;
    try {
        res = await api.v1.chain.push_transaction(signedTransaction);
    } catch (e) {
        console.error(JSON.stringify(e, null, 2));
        throw e;
    }
    return res;
}

export { transact, Signer, createSigner, createAuthenticatorSigner };