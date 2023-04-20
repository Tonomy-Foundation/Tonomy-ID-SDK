import { API, Signature, Checksum256, Name, PrivateKey } from '@greymass/eosio';
import { KeyManager, KeyManagerLevel } from '../keymanager';
declare type ActionData = {
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
        details: [{
            message: string;
            file: string;
            line_number: number;
            method: string;
        }];
    };
}
declare function createSigner(privateKey: PrivateKey): Signer;
declare function createKeyManagerSigner(keyManager: KeyManager, level: KeyManagerLevel, challenge?: string): Signer;
export declare class AntelopePushTransactionError extends Error {
    code: number;
    message: string;
    error: {
        code: number;
        name: string;
        what: string;
        details: [{
            message: string;
            file: string;
            line_number: number;
            method: string;
        }];
    };
    constructor(err: AntelopePushTransactionErrorConstructor);
    hasErrorCode(code: number): boolean;
    hasTonomyErrorCode(code: string): boolean;
}
declare function transact(contract: Name, actions: ActionData[], signer: Signer): Promise<API.v1.PushTransactionResponse>;
export { transact, Signer, createSigner, createKeyManagerSigner };
