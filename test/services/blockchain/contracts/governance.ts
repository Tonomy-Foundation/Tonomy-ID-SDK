import { API } from '@wharfkit/antelope';
import {
    AnyActionType,
    createSigner,
    getEosioMsigContract,
    getTonomyOperationsKey,
} from '../../../../src/sdk/services/blockchain';
import { randomAccountName, tonomyBoardSigners } from '../../../helpers/eosio';

export const tonomyOpsSigner = createSigner(getTonomyOperationsKey());

// asserts = 3
export async function msigAction(
    actions: AnyActionType | AnyActionType[],
    options: { satisfyRequireApproval?: boolean; requireTonomyOps?: boolean } = {}
): Promise<API.v1.PushTransactionResponse | null> {
    const proposalName = randomAccountName();
    const proposer = '1.found.tmy';

    const requested = [
        {
            actor: '1.found.tmy',
            permission: 'active',
        },
        {
            actor: '2.found.tmy',
            permission: 'active',
        },
        {
            actor: '3.found.tmy',
            permission: 'active',
        },
    ];

    if (options.requireTonomyOps ?? false) {
        requested.push({
            actor: 'tonomy',
            permission: 'active',
        });
    }

    const { proposalHash, transaction } = await getEosioMsigContract().propose(
        proposer,
        proposalName,
        requested,
        Array.isArray(actions) ? actions : [actions],
        tonomyBoardSigners[0]
    );

    expect(transaction.processed.receipt.status).toBe('executed');

    const approve1Trx = await getEosioMsigContract().approve(
        proposer,
        proposalName,
        { actor: '1.found.tmy', permission: 'active' },
        proposalHash,
        tonomyBoardSigners[0]
    );

    expect(approve1Trx.processed.receipt.status).toBe('executed');

    if (options.satisfyRequireApproval ?? false) {
        await getEosioMsigContract().approve(
            proposer,
            proposalName,
            { actor: '2.found.tmy', permission: 'active' },
            proposalHash,
            tonomyBoardSigners[1]
        );
    }

    if (options.requireTonomyOps ?? false) {
        await getEosioMsigContract().approve(
            proposer,
            proposalName,
            { actor: 'tonomy', permission: 'active' },
            proposalHash,
            tonomyOpsSigner
        );
    }

    try {
        const execTrx = await getEosioMsigContract().exec(proposer, proposalName, '1.found.tmy', tonomyBoardSigners[0]);

        if (options.satisfyRequireApproval ?? false) {
            expect(execTrx.processed.receipt.status).toBe('executed');
        }

        return execTrx;
    } catch (e) {
        if (!(options.satisfyRequireApproval ?? false)) {
            expect(e.error.details[0].message).toContain('transaction authorization failed');
            return null;
        } else {
            throw e;
        }
    }
}
