/* eslint-disable camelcase */
import {
    API,
    Checksum256Type,
    Checksum256,
    NameType,
    PermissionLevelType,
    Transaction,
    UInt16Type,
} from '@wharfkit/antelope';
import { Contract, loadContract } from './Contract';
import { AnyActionType, Signer, transact, createActionWithAbi } from '../eosio/transaction';
import { Contract as AntelopeContract } from '@wharfkit/contract';
import { getApi, getChainInfo } from '../eosio/eosio';
import { ActionOptions } from '@wharfkit/contract';
import { activeAuthority } from '../eosio/authority';
import abi from './abi/eosio.msig.abi.json';
import { isProduction } from '../../../util';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:services:blockchain:contracts:EosioMsigContract');

const CONTRACT_NAME: NameType = 'eosio.msig';

export class EosioMsigContract extends Contract {
    static async atAccount(account: NameType = CONTRACT_NAME): Promise<EosioMsigContract> {
        return new this(await loadContract(account));
    }

    static fromAbi(abi: any, account: NameType = CONTRACT_NAME): EosioMsigContract {
        const contract = new AntelopeContract({ abi, client: getApi(), account });

        return new this(contract, isProduction());
    }

    actions = {
        propose: (
            data: { proposer: NameType; proposalName: NameType; requested: PermissionLevelType[]; trx: any },
            authorization: ActionOptions = activeAuthority(data.proposer)
        ) =>
            this.action(
                'propose',
                {
                    proposer: data.proposer,
                    proposal_name: data.proposalName,
                    requested: data.requested,
                    trx: data.trx,
                },
                authorization
            ),

        approve: (
            data: {
                proposer: NameType;
                proposalName: NameType;
                level: PermissionLevelType;
                proposalHash?: Checksum256Type;
            },
            authorization: ActionOptions = activeAuthority(data.level.actor)
        ) =>
            this.action(
                'approve',
                {
                    proposer: data.proposer,
                    proposal_name: data.proposalName,
                    level: data.level,
                    proposal_hash: data.proposalHash,
                },
                authorization
            ),

        exec: (
            data: { proposer: NameType; proposalName: NameType; executer: NameType },
            authorization: ActionOptions = activeAuthority(data.executer)
        ) =>
            this.action(
                'exec',
                {
                    proposer: data.proposer,
                    proposal_name: data.proposalName,
                    executer: data.executer,
                },
                authorization
            ),

        cancel: (
            data: { proposer: NameType; proposalName: NameType; canceler: NameType },
            authorization: ActionOptions = activeAuthority(data.canceler)
        ) =>
            this.action(
                'cancel',
                {
                    proposer: data.proposer,
                    proposal_name: data.proposalName,
                    canceler: data.canceler,
                },
                authorization
            ),
    };

    async propose(
        proposer: NameType,
        proposalName: NameType,
        requested: PermissionLevelType[],
        actions: AnyActionType[],
        signer: Signer
    ): Promise<{ transaction: API.v1.PushTransactionResponse; proposalHash: Checksum256 }> {
        const actionsArray = await Promise.all(actions.map(createActionWithAbi));

        // compute expiration (7 days)
        const now = new Date();
        const expireInSeconds = 60 * 60 * 24 * 7; // 7 days
        const expiration = new Date(now.getTime() + expireInSeconds * 1000);
        const expirationString = expiration.toISOString().split('.')[0];

        const info = await getChainInfo();
        const trx = {
            expiration: expirationString,
            ref_block_num: info.getTransactionHeader().ref_block_num as unknown as UInt16Type,
            ref_block_prefix: info.getTransactionHeader().ref_block_prefix as unknown as UInt16Type,
            max_net_usage_words: 0,
            max_cpu_usage_ms: 0,
            delay_sec: 0,
            context_free_actions: [],
            actions: actionsArray,
            transaction_extensions: [],
        };
        const proposalTrx = Transaction.from(trx);
        const proposalHash = proposalTrx.id;

        debug('Propose transaction', { ...trx, actions: actionsArray.map((action) => action.decoded) });
        const action = this.actions.propose({ proposer, proposalName, requested, trx });
        const transaction = await transact(action, signer);

        return { proposalHash, transaction };
    }

    async approve(
        proposer: NameType,
        proposalName: NameType,
        level: PermissionLevelType,
        proposalHash: Checksum256Type | undefined,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.approve({ proposer, proposalName, level, proposalHash });

        return await transact(action, signer);
    }

    async exec(
        proposer: NameType,
        proposalName: NameType,
        executer: NameType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.exec({ proposer, proposalName, executer });

        return await transact(action, signer);
    }

    async cancel(
        proposer: NameType,
        proposalName: NameType,
        canceler: NameType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.cancel({ proposer, proposalName, canceler });

        return await transact(action, signer);
    }
}

let eosioMsigContract: EosioMsigContract | undefined;

export const getEosioMsigContract = () => {
    if (!eosioMsigContract) {
        eosioMsigContract = EosioMsigContract.fromAbi(abi);
    }

    return eosioMsigContract;
};

export async function loadEosioMsigContract(account: NameType = CONTRACT_NAME): Promise<EosioMsigContract> {
    return await EosioMsigContract.atAccount(account);
}
