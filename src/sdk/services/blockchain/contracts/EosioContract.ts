/* eslint-disable camelcase */
import { ABI, API, NameType, Serializer, Action, AuthorityType, PermissionLevelType } from '@wharfkit/antelope';
import { Contract, loadContract } from './Contract';
import { activeAuthority, Authority } from '../eosio/authority';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';
import { Contract as AntelopeContract, ActionOptions } from '@wharfkit/contract';
import abi from './abi/eosio.tonomy.abi.json';

const CONTRACT_NAME: NameType = 'eosio';

export class EosioContract extends Contract {
    static async atAccount(account: NameType = CONTRACT_NAME): Promise<EosioContract> {
        return new this(await loadContract(account));
    }

    static fromAbi(abi: any, account: NameType = CONTRACT_NAME): EosioContract {
        const contract = new AntelopeContract({ abi, client: getApi(), account });

        return new this(contract);
    }

    actions = {
        setCode: (
            data: { account: NameType; vmtype: number; vmversion: number; code: string },
            authorization: ActionOptions = activeAuthority(data.account)
        ) => this.action('setcode', data, authorization),
        setAbi: (
            data: { account: NameType; abi: string },
            authorization: ActionOptions = activeAuthority(data.account)
        ) => this.action('setabi', data, authorization),
        updateAuth: (
            data: { account: NameType; permission: NameType; parent: NameType; auth: AuthorityType },
            authorization: ActionOptions = activeAuthority(data.account)
        ) =>
            this.action(
                'updateauth',
                {
                    account: data.account,
                    permission: data.permission,
                    parent: data.parent === 'owner' ? '' : data.parent,
                    auth: data.auth,
                },
                authorization
            ),
        newAccount: (
            data: { creator: NameType; name: NameType; owner: AuthorityType; active: AuthorityType },
            authorization: ActionOptions = activeAuthority(data.creator)
        ) => this.action('newaccount', data, authorization),
        linkAuth: (
            data: { account: NameType; code: NameType; type: NameType; requirement: NameType },
            authorization: ActionOptions = activeAuthority(data.account)
        ) => this.action('linkauth', data, authorization),
        setPriv: (data: { account: NameType; isPriv: number }, authorization?: ActionOptions) =>
            this.action('setpriv', { account: data.account, is_priv: data.isPriv }, authorization),
        setParams: (data: { params: BlockchainParams }, authorization?: ActionOptions) =>
            this.action('setparams', data, authorization),
    };

    /** prepare setcode & setabi actions */
    async deployContractActions(
        account: NameType,
        wasmFileContent: string | Buffer,
        abiFileContent: string | Buffer,
        extraAuthorization?: PermissionLevelType
    ): Promise<Action[]> {
        const wasmHex = wasmFileContent.toString('hex');
        const abiJson = JSON.parse(abiFileContent.toString());
        const abiDef = ABI.from(abiJson);
        const abiHex = Serializer.encode({ object: abiDef }).hexString;

        const auth = activeAuthority(account);

        if (extraAuthorization) auth.authorization.push(extraAuthorization);

        const setCode = this.actions.setCode({ account, vmtype: 0, vmversion: 0, code: wasmHex }, auth);
        const setAbi = this.actions.setAbi({ account, abi: abiHex }, auth);

        return [setCode, setAbi];
    }

    /** deploy contract via transact */
    async deployContract(
        account: NameType,
        wasmFileContent: string | Buffer,
        abiFileContent: string | Buffer,
        signer: Signer | Signer[],
        extraAuthorization?: PermissionLevelType
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = await this.deployContractActions(account, wasmFileContent, abiFileContent, extraAuthorization);

        return transact(actions, signer);
    }

    async updateAuth(
        account: NameType,
        permission: NameType,
        parent: NameType,
        auth: AuthorityType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.updateAuth({ account, permission, parent, auth });

        return transact(action, signer);
    }

    async newAccount(
        creator: NameType,
        name: NameType,
        owner: Authority,
        active: Authority,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.newAccount({ creator, name, owner, active });

        return transact(action, signer);
    }

    async linkAuth(
        account: NameType,
        code: NameType,
        type: NameType,
        requirement: NameType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.linkAuth({ account, code, type, requirement });

        return transact(action, signer);
    }

    async setPriv(account: NameType, isPriv: number, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.setPriv({ account, isPriv });

        return transact(action, signer);
    }

    async setParams(
        blockchainParameters: BlockchainParams = defaultBlockchainParams,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.setParams({ params: blockchainParameters });

        return transact(action, signer);
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
    max_inline_action_size: 512 * 1024,
    max_inline_action_depth: 4,
    max_authority_depth: 6,
};

export async function loadEosioContract(account: NameType = CONTRACT_NAME): Promise<EosioContract> {
    return await EosioContract.atAccount(account);
}

export const eosioContract = EosioContract.fromAbi(abi);
