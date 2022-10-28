import {
    Action,
    API,
    Transaction,
    SignedTransaction,
    Signature,
    Checksum256,
    Name,
    PrivateKey,
} from '@greymass/eosio';
import { KeyManager, KeyManagerLevel } from '../../keymanager';
import { HttpError } from '../errors';
import { getApi } from './eosio';

type ActionData = {
    authorization: {
        actor: string;
        permission: string;
    }[];
    account?: string;
    name: string;
    data: any;
};

interface Signer {
    sign(digest: Checksum256): Promise<Signature>;
}

function createSigner(privateKey: PrivateKey): Signer {
    return {
        async sign(digest: Checksum256): Promise<Signature> {
            return privateKey.signDigest(digest);
        },
    };
}

function createKeyManagerSigner(
    keyManager: KeyManager,
    level: KeyManagerLevel,
    password: string
): Signer {
    return {
        async sign(digest: Checksum256): Promise<Signature> {
            return (await keyManager.signData({
                level,
                data: digest,
                challenge: password,
            })) as Signature;
        },
    };
}

export class AntelopePushTransactionError extends Error {
    code: number; // HTTP error code
    message: string; // HTTP error message
    error: {
        code: number; // Antelope error code
        name: string;
        what: string;
        details: [
            {
                message: string;
                file: string;
                line_number: number;
                method: string;
            }
        ];
    };

    constructor(err: any) {
        super('AntelopePushTransactionError');

        this.code = err.code;
        this.message = err.message;
        this.error = err.error;

        // Ensure the name of this error is the same as the class name
        this.name = this.constructor.name;
        // This clips the constructor invocation from the stack trace.
        // It's not absolutely essential, but it does make the stack trace a little nicer.
        //  @see Node.js reference (bottom)

        // TODO fix this. The following line should be uncommented. It is commented out because it is causing a TS error:
        // TypeError: Error.captureStackTrace is not a function
        // Error.captureStackTrace(this, this.constructor);
    }
}

async function transact(
    contract: Name,
    actions: ActionData[],
    signer: Signer
): Promise<API.v1.PushTransactionResponse> {
    // Get the ABI
    const api = await getApi();
    const abi = await api.v1.chain.get_abi(contract);

    // Create the action data
    const actionData: Action[] = [];
    actions.forEach((data) => {
        actionData.push(Action.from({ ...data, account: contract }, abi.abi));
    });

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
    const signedTransaction = SignedTransaction.from({
        ...transaction,
        signatures: [signature],
    });

    // Send to the node
    let res;
    try {
        res = await api.v1.chain.push_transaction(signedTransaction);
    } catch (e) {
        // console.error(JSON.stringify(e, null, 2));
        if (e.response && e.response.headers) {
            if (e.response.json) {
                console.log('pushTransaction() AntelopePushTransactionError');
                const err = new AntelopePushTransactionError(e.response.json);
                console.log(
                    'pushTransaction() AntelopePushTransactionError',
                    err instanceof AntelopePushTransactionError,
                    err
                );
                throw err;
            }
            throw new HttpError(e);
        }
        throw e;
    }
    return res;
}

export { transact, Signer, createSigner, createKeyManagerSigner };
