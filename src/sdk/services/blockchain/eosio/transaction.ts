import {
    API,
    Transaction,
    SignedTransaction,
    Signature,
    Checksum256,
    Name,
    PrivateKey,
    ActionType,
    AnyAction,
    Action,
    ABI,
    Checksum256Type,
} from '@wharfkit/antelope';
import { KeyManager, KeyManagerLevel } from '../../../storage/keymanager';
import { HttpError } from '../../../util/errors';
import { fetchAbi, getApi, getChainInfo } from './eosio';
import Debug from 'debug';
import { sleep } from '../../../util';

const debug = Debug('tonomy-sdk:services:blockchain:eosio:transaction');

export interface Signer {
    sign(digest: Checksum256 | string): Promise<Signature>;
}

interface AntelopePushTransactionErrorConstructor {
    message: string;
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
            },
        ];
    };
    actions?: ActionType[];
    contract?: Name;
}

export function createSigner(privateKey: PrivateKey): Signer {
    return {
        async sign(digest: Checksum256): Promise<Signature> {
            return privateKey.signDigest(digest);
        },
    };
}

export function createKeyManagerSigner(keyManager: KeyManager, level: KeyManagerLevel, challenge?: string): Signer {
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
            },
        ];
    };
    actions?: ActionType[];
    contract?: Name;

    constructor(err: AntelopePushTransactionErrorConstructor) {
        super('AntelopePushTransactionError');

        this.code = err.code;
        this.message = err.error.what;

        if (Array.isArray(err.error?.details) && err.error.details.length > 0) {
            this.message += ': ' + err.error.details[0].message;
        }

        this.error = err.error;
        this.contract = err.contract;
        this.actions = err.actions
            ? err.actions.map((action) => (action instanceof Action ? action.decoded : action))
            : undefined;
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
        // TODO: iterate over details array instead of only looking at first element
        return this.error.details[0].message.search(code) > 0;
    }
}

export type AnyActionType = ActionType | AnyAction;

export async function toPrintableActions(actions: AnyActionType | AnyActionType[]): Promise<any[]> {
    const actionsArray = await Promise.all((Array.isArray(actions) ? actions : [actions]).map(createActionWithAbi));

    return actionsArray.map((action) => action.decoded);
}

export async function transact(
    actions: AnyActionType | AnyActionType[],
    signer: Signer | Signer[]
): Promise<API.v1.PushTransactionResponse> {
    // Get the ABI
    const actionsArray = await Promise.all((Array.isArray(actions) ? actions : [actions]).map(createActionWithAbi));

    // Construct the transaction
    const info = await getChainInfo();
    const header = info.getTransactionHeader();
    const transaction = Transaction.from({
        ...header,
        actions: actionsArray,
    });

    // Create signature
    const signersArray = Array.isArray(signer) ? signer : [signer];
    const signDigest = transaction.signingDigest(info.chain_id);
    const signatures = await Promise.all(signersArray.map((s) => s.sign(signDigest)));
    const signedTransaction = SignedTransaction.from({
        ...transaction,
        signatures,
    });

    try {
        debug('Pushing transaction', JSON.stringify(await toPrintableActions(actionsArray), null, 2));
        return await getApi().v1.chain.push_transaction(signedTransaction);
    } catch (e) {
        debug('Error pushing transaction', e);

        if (e.response?.headers) {
            if (e.response?.json) {
                throw new AntelopePushTransactionError({ ...e.response.json, actions: actionsArray });
            }

            throw new HttpError(e);
        }

        throw e;
    }
}

type ActionWithABI = Action & { abi: ABI };

export async function createActionWithAbi(action: AnyActionType): Promise<ActionWithABI> {
    if (action instanceof Action && action.abi) return action as ActionWithABI;
    const abi = await fetchAbi(action.account);

    return Action.from(action, abi) as ActionWithABI;
}

export async function waitForTransactionFinalization(
    transactionId: Checksum256Type,
    timeout: number = 30000,
    interval: number = 1000
): Promise<API.v1.GetTransactionResponse> {
    const api = getApi();
    const start = Date.now();

    const result = await api.v1.history.get_transaction(transactionId);

    // Wait till the transaction is confirmed in an irreversible block
    while (Date.now() - start < timeout) {
        try {
            const info = await getChainInfo();

            if (result.block_num.gte(info.last_irreversible_block_num)) {
                return result;
            }
        } catch (e) {
            // Ignore errors, as the transaction might not be found yet
        }

        await sleep(interval);
    }

    throw new Error(`Transaction ${transactionId} was not finalized within ${timeout} ms`);
}
