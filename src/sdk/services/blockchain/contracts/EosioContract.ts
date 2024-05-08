/* eslint-disable camelcase */
import { ABI, API, Name, NameType, Serializer } from '@wharfkit/antelope';
import { Authority } from '../eosio/authority';
import { Signer, transact } from '../eosio/transaction';

const CONTRACT_NAME = 'eosio';

export class EosioContract {
    static singletonInstance: EosioContract;
    contractName = CONTRACT_NAME;

    public static get Instance() {
        return this.singletonInstance || (this.singletonInstance = new this());
    }

    constructor(contractName = CONTRACT_NAME) {
        this.contractName = contractName;
    }

    /**
     * Deploys a contract at the specified address
     *
     * @param account - Account where the contract will be deployed
     * @param wasmFileContents - wasmFile after reading with fs.readFileSync(path) or equivalent
     * @param abiFileContents - abiFile after reading with fs.readFileSync(path, `utf8`) or equivalent
     * @param signer - Signer to sign the transaction
     * @param [extraAuthorization] - Extra authorization to be added to the transaction
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
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
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
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async newaccount(
        creator: NameType,
        name: NameType,
        owner: Authority,
        active: Authority,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: creator.toString(),
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'newaccount',
            data: {
                creator,
                name,
                owner,
                active,
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

    async setPriv(account: string, isPriv: number, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: CONTRACT_NAME,
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

    async setParams(
        blockchainParameters: BlockchainParams = defaultBlockchainParams,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: CONTRACT_NAME,
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'setparams',
            data: { params: blockchainParameters },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }
}

export interface BlockchainParams {
    // NET
    max_block_net_usage: number; // the maximum net usage in instructions for a block (uint64_t)
    target_block_net_usage_pct: number; // The target percent (1% == 100, 100%= 10,000) of maximum net usage; exceeding this triggers congestion handling. (uint32_t)
    max_transaction_net_usage: number; // The maximum objectively measured net usage that the chain will allow regardless of account limits. (uint32_t)
    base_per_transaction_net_usage: number; // (uint32_t)
    net_usage_leeway: number; // The amount of net usage leeway available whilst executing a transaction (still checks against new limits without leeway at the end of the transaction) (uint32_t)
    context_free_discount_net_usage_num: number; // The numerator for the discount on net usage of context-free data. (uint32_t)
    context_free_discount_net_usage_den: number; // The denominator for the discount on net usage of context-free data. (uint32_t)
    // CPU
    max_block_cpu_usage: number; // The maximum billable cpu usage (in microseconds) for a block. (uint32_t)
    target_block_cpu_usage_pct: number; // The target percent (1% == 100, 100%= 10,000) of maximum cpu usage; exceeding this triggers congestion handling. (uint32_t)
    max_transaction_cpu_usage: number; // The maximum billable cpu usage (in microseconds) that the chain will allow regardless of account limits. (uint32_t)
    min_transaction_cpu_usage: number; // The minimum billable cpu usage (in microseconds) that the chain requires. (uint32_t)
    // Other
    max_transaction_lifetime: number; // Maximum lifetime of a transaction. (uint32_t)
    deferred_trx_expiration_window: number; // the number of seconds after the time a deferred transaction can first execute until it expires (uint32_t)
    max_transaction_delay: number; // The maximum number of seconds that can be imposed as a delay requirement by authorization checks. (uint32_t)
    max_inline_action_size: number; // Maximum size of inline action. (uint32_t)
    max_inline_action_depth: number; // Maximum depth of inline action. (uint16_t)
    max_authority_depth: number; // Maximum authority depth. (uint16_t)
}

export const defaultBlockchainParams: BlockchainParams = {
    // NET
    max_block_net_usage: 1024 * 1024,
    target_block_net_usage_pct: 8000, // 80%
    max_transaction_net_usage: 1024 * 512,
    base_per_transaction_net_usage: 12,
    net_usage_leeway: 500,
    context_free_discount_net_usage_num: 20,
    context_free_discount_net_usage_den: 100,
    // CPU
    max_block_cpu_usage: 200000,
    target_block_cpu_usage_pct: 8000, // 80%
    max_transaction_cpu_usage: 50000,
    min_transaction_cpu_usage: 100,
    // Other
    max_transaction_lifetime: 3600,
    deferred_trx_expiration_window: 600,
    max_transaction_delay: 3888000,
    max_inline_action_size: 32 * 1024,
    max_inline_action_depth: 4,
    max_authority_depth: 6,
};
