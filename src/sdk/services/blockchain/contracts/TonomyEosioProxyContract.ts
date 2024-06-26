/* eslint-disable camelcase */
import { ABI, API, Name, Serializer } from '@wharfkit/antelope';
import { Authority } from '../eosio/authority';
import { Signer, transact } from '../eosio/transaction';
import { GOVERNANCE_ACCOUNT_NAME } from './TonomyContract';

const CONTRACT_NAME = 'tonomy';

export class TonomyEosioProxyContract {
    static singletonInstance: TonomyEosioProxyContract;

    public static get Instance() {
        return this.singletonInstance || (this.singletonInstance = new this());
    }

    /**
     * Deploys a contract at the specified address
     *
     * @param account - Account where the contract will be deployed
     * @param wasmFileContents - wasmFile after reading with fs.readFileSync(path) or equivalent
     * @param abiFileContents - abiFile after reading with fs.readFileSync(path, `utf8`) or equivalent
     * @param signer - Signer or Signer[] to sign the transaction
     * @param extraAuthorization - Extra authorization to be added to the transaction
     */
    async deployContract(
        account: Name,
        wasmFileContent: any,
        abiFileContent: any,
        signer: Signer | Signer[],
        options: { extraAuthorization?: { actor: string; permission: string } } = {}
    ): Promise<API.v1.PushTransactionResponse> {
        // 1. Prepare SETCODE
        // read the file and make a hex string out of it
        const wasm = wasmFileContent.toString(`hex`);

        // 2. Prepare SETABI
        const abi = JSON.parse(abiFileContent);
        const abiDef = ABI.from(abi);
        const abiSerializedHex = Serializer.encode({ object: abiDef }).hexString;

        // 3. Send transaction with both setcode and setabi actions
        const setCodeAction = {
            account: CONTRACT_NAME,
            name: 'setcode',
            authorization: [
                {
                    actor: account.toString(),
                    permission: 'active',
                },
            ],
            data: {
                account: account.toString(),
                vmtype: 0,
                vmversion: 0,
                code: wasm,
            },
        };

        if (options.extraAuthorization) setCodeAction.authorization.push(options.extraAuthorization);
        const setAbiAction = {
            account: CONTRACT_NAME,
            name: 'setabi',
            authorization: [
                {
                    actor: account.toString(),
                    permission: 'active',
                },
            ],
            data: {
                account,
                abi: abiSerializedHex,
            },
        };

        if (options.extraAuthorization) setAbiAction.authorization.push(options.extraAuthorization);
        const actions = [setCodeAction, setAbiAction];

        return await transact(Name.from(CONTRACT_NAME), actions, signer);
    }

    async updateauth(
        account: string,
        permission: string,
        parent: string,
        auth: Authority,
        signer: Signer,
        options: { authParent?: boolean } = {}
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: GOVERNANCE_ACCOUNT_NAME,
                    permission: 'active',
                },
                {
                    actor: account,
                    permission: parent, // all higher parents, and permission, work as authorization. though permission is supposed to be the authorization that works
                },
            ],
            account: CONTRACT_NAME,
            name: 'updateauth',
            data: {
                account,
                permission,
                parent: permission === 'owner' ? '' : parent,
                auth,
                auth_parent: options.authParent ?? false, // should be true when a new permission is being created, otherwise false
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    /**
     * @param account - the permission's owner to be linked and the payer of the RAM needed to store this link,
     * @param code - the owner of the action to be linked,
     * @param type - the action to be linked,
     * @param requirement - the permission to be linked.
     */
    async linkAuth(
        account: string,
        code: string,
        type: string,
        requirement: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: account,
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'linkauth',
            data: {
                account,
                code,
                type,
                requirement,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async setpriv(account: string, isPriv: number, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: GOVERNANCE_ACCOUNT_NAME,
                    permission: 'active',
                },
                {
                    actor: account,
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'setpriv',
            data: {
                account,
                is_priv: isPriv,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }
}
