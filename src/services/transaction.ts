import { Action, Transaction, SignedTransaction, Signature, Checksum256, Name } from "@greymass/eosio";
import { api } from "./eosio";

type ActionData = {
    authorization: [
        {
            actor: string;
            permission: string;
        },
    ],
    account: string,
    name: string,
    data: any,
}

async function transact(contract: Name, actions: ActionData[], signer: (data: Checksum256) => Signature): Promise<any> {
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

    const signature = signer(transaction.signingDigest(info.chain_id));
    const signedTransaction = SignedTransaction.from({
        ...transaction,
        signatures: [signature],
    });

    return await api.v1.chain.push_transaction(signedTransaction);

}

export { transact };