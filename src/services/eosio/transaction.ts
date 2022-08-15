import { Action, Transaction, SignedTransaction, Signature, Checksum256, Name } from "@greymass/eosio";
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
    sign(digest: Checksum256): Signature;
}

async function transact(contract: Name, actions: ActionData[], signer: Signer): Promise<any> {
    const abi = await api.v1.chain.get_abi(contract);
    const actionData: Action[] = [];
    actions.forEach((data) => {
        actionData.push(Action.from({ ...data, account: contract }, abi.abi));
    })

    const info = await api.v1.chain.get_info();
    const header = info.getTransactionHeader();
    const transaction = Transaction.from({
        ...header,
        actions: actionData,
    });
    const signDigest = transaction.signingDigest(info.chain_id)
    const signature = signer.sign(signDigest);
    const signedTransaction = SignedTransaction.from({
        ...transaction,
        signatures: [signature],
    });

    return await api.v1.chain.push_transaction(signedTransaction);
}

export { transact, Signer };