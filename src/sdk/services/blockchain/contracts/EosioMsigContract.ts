/* eslint-disable camelcase */
import {
    API,
    Checksum256Type,
    Checksum256,
    Name,
    NameType,
    PermissionLevelType,
    Transaction,
} from '@wharfkit/antelope';
import { ActionData, Signer, transact } from '../eosio/transaction';
import { getApi, serializeActionData } from '../eosio/eosio';

const CONTRACT_NAME = 'eosio.msig';

export class EosioMsigContract {
    static singletonInstance: EosioMsigContract;
    contractName = CONTRACT_NAME;

    public static get Instance() {
        return this.singletonInstance || (this.singletonInstance = new this());
    }

    constructor(contractName = CONTRACT_NAME) {
        this.contractName = contractName;
    }

    async propose(
        proposer: NameType,
        proposalName: NameType,
        requested: PermissionLevelType[],
        actions: ActionData[],
        signer: Signer
    ): Promise<{ transaction: API.v1.PushTransactionResponse; proposalHash: Checksum256 }> {
        // Serialize the actions
        const serializedActions = await Promise.all(
            actions.map(async (action) => {
                if (!action.account || !action.name) throw new Error('Invalid action');
                return {
                    account: action.account,
                    name: action.name,
                    authorization: action.authorization,
                    data: await serializeActionData(action.account, action.name, action.data),
                };
            })
        );

        // Determine expiration
        const now = new Date();
        const expireInSeconds = 60 * 60 * 24 * 7; // 7 days
        const expiration = new Date(now.getTime() + expireInSeconds * 1000);
        const expirationString = expiration.toISOString().split('.')[0];

        const info = await (await getApi()).v1.chain.get_info();
        const trx = {
            expiration: expirationString,
            ref_block_num: info.getTransactionHeader().ref_block_num,
            ref_block_prefix: info.getTransactionHeader().ref_block_prefix,
            max_net_usage_words: 0,
            max_cpu_usage_ms: 0,
            delay_sec: 0,
            context_free_actions: [],
            actions: serializedActions,
            transaction_extensions: [],
        };
        const proposalTrx = Transaction.from(trx);
        const proposalHash = proposalTrx.id;

        // Action data (not sure if this is right format)
        const data = {
            proposer,
            proposal_name: proposalName,
            requested,
            trx,
        };

        // Propose action
        const action = {
            authorization: [
                {
                    actor: proposer.toString(),
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'propose',
            data,
        };

        const myTrx = await transact(Name.from(CONTRACT_NAME), [action], signer);

        return {
            proposalHash,
            transaction: myTrx,
        };
    }

    async approve(
        proposer: NameType,
        proposalName: NameType,
        approver: NameType,
        proposalHash: undefined | Checksum256Type,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const auth = { actor: approver.toString(), permission: 'active' };
        const actions = [
            {
                account: CONTRACT_NAME,
                name: 'approve',
                authorization: [auth],
                data: {
                    proposer,
                    proposal_name: proposalName,
                    level: auth,
                    proposal_hash: proposalHash,
                },
            },
        ];

        return await transact(Name.from(CONTRACT_NAME), actions, signer);
    }

    async exec(
        proposer: NameType,
        proposalName: NameType,
        executer: NameType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: CONTRACT_NAME,
                name: 'exec',
                authorization: [
                    {
                        actor: executer.toString(),
                        permission: 'active',
                    },
                ],
                data: {
                    proposer,
                    proposal_name: proposalName,
                    executer,
                },
            },
        ];

        return await transact(Name.from(CONTRACT_NAME), actions, signer);
    }

    async cancel(
        proposer: NameType,
        proposalName: NameType,
        canceler: NameType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: CONTRACT_NAME,
                name: 'cancel',
                authorization: [
                    {
                        actor: canceler.toString(),
                        permission: 'active',
                    },
                ],
                data: {
                    proposer,
                    proposal_name: proposalName,
                    canceler,
                },
            },
        ];

        return await transact(Name.from(CONTRACT_NAME), actions, signer);
    }
}
