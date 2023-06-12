import { Action, API, Transaction, SignedTransaction, Signature, Checksum256, Name, PrivateKey } from '@greymass/eosio';
import { KeyManager, KeyManagerLevel } from '../../../storage/keymanager';
import { HttpError } from '../../../util/errors';
import { getApi } from './eosio';

/**
 * Action data for a transaction
 * @property {string} account - The smart contract account name
 * @property {string} name - The name of the action (function in the smart contract)
 * @property {object} data - The data for the action (arguments for the function)
 * @property {object} authorization - The authorization for the action
 */
export type ActionData = {
    authorization: {
        actor: string;
        permission: string;
    }[];
    account?: string;
    name: string;
    data: object;
};

interface Signer {
    sign(digest: Checksum256 | string): Promise<Signature>;
}

interface AntelopePushTransactionErrorConstructor extends Error {
    code: number;
    error: {
        code: number;
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
}

function createSigner(privateKey: PrivateKey): Signer {
    return {
        async sign(digest: Checksum256): Promise<Signature> {
            return privateKey.signDigest(digest);
        },
    };
}

function createKeyManagerSigner(keyManager: KeyManager, level: KeyManagerLevel, challenge?: string): Signer {
    return {
        async sign(digest: string | Checksum256): Promise<Signature> {
            return (await keyManager.signData({
                level,
                data: digest,
                challenge,
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

    constructor(err: AntelopePushTransactionErrorConstructor) {
        super('AntelopePushTransactionError');

        this.code = err.code;
        this.message = err.message;
        this.error = err.error;
        this.stack = new Error().stack;
        // Ensure the name of this error is the same as the class name
        this.name = this.constructor.name;
        // This clips the constructor invocation from the stack trace.
        // It's not absolutely essential, but it does make the stack trace a little nicer.
        //  @see Node.js reference (bottom)

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    hasErrorCode(code: number): boolean {
        return this.error.code === code;
    }

    hasTonomyErrorCode(code: string): boolean {
        // TODO iterate over deatils array instead of only looking at first element
        return this.error.details[0].message.search(code) > 0;
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
        actionData.push(Action.from({ account: contract, ...data }, abi.abi));
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
        const error = e as any;

        if (error.response && error.response.headers) {
            if (error.response.json) {
                throw new AntelopePushTransactionError(error.response.json);
            }

            throw new HttpError(error);
        }

        throw e;
    }

    return res;
}

export { transact, Signer, createSigner, createKeyManagerSigner };
