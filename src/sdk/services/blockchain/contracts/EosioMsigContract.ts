/* eslint-disable camelcase */
import { API, Name, NameType, PermissionLevelType } from '@wharfkit/antelope';
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
    ): Promise<API.v1.PushTransactionResponse> {
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
        const expireInSeconds = 60;
        const expiration = new Date(now.getTime() + expireInSeconds * 1000);
        const expirationString = expiration.toISOString().split('.')[0];

        const info = await (await getApi()).v1.chain.get_info();

        // Action data (not sure if this is right format)
        const data = {
            proposer,
            proposal_name: proposalName,
            requested,
            trx: {
                expiration: expirationString,
                ref_block_num: info.head_block_num,
                ref_block_prefix: 0,
                max_net_usage_words: 0,
                max_cpu_usage_ms: 0,
                delay_sec: 0,
                context_free_actions: [],
                actions: serializedActions,
                transaction_extensions: [],
            },
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

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }
}
