import { Name } from '@wharfkit/antelope';
import { EosioMsigContract } from '../../../../src/sdk/index';
import { ActionData, createSigner, getTonomyOperationsKey } from '../../../../src/sdk/services/blockchain';
import { randomAccountName, tonomyBoardSigners } from '../../../helpers/eosio';

const eosioMsigContract = EosioMsigContract.Instance;

export const tonomyOpsSigner = createSigner(getTonomyOperationsKey());

// asserts = 3
export async function msigAction(
    actions: ActionData[],
    options: { satisfyRequireApproval?: boolean; requireTonomyOps?: boolean } = {}
) {
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

    const { proposalHash, transaction } = await eosioMsigContract.propose(
        proposer,
        proposalName,
        requested,
        actions,
        tonomyBoardSigners[0]
    );

    expect(transaction.processed.receipt.status).toBe('executed');

    const approve1Trx = await eosioMsigContract.approve(
        proposer,
        proposalName,
        {
            actor: Name.from('1.found.tmy'),
            permission: Name.from('active'),
        },
        proposalHash,
        tonomyBoardSigners[0]
    );

    expect(approve1Trx.processed.receipt.status).toBe('executed');

    if (options.satisfyRequireApproval ?? false) {
        await eosioMsigContract.approve(
            proposer,
            proposalName,
            {
                actor: Name.from('2.found.tmy'),
                permission: Name.from('active'),
            },
            proposalHash,
            tonomyBoardSigners[1]
        );
    }

    if (options.requireTonomyOps ?? false) {
        await eosioMsigContract.approve(
            proposer,
            proposalName,
            {
                actor: Name.from('tonomy'),
                permission: Name.from('active'),
            },
            proposalHash,
            tonomyOpsSigner
        );
    }

    try {
        const execTrx = await eosioMsigContract.exec(proposer, proposalName, '1.found.tmy', tonomyBoardSigners[0]);

        if (options.satisfyRequireApproval ?? false) {
            expect(execTrx.processed.receipt.status).toBe('executed');
        }

        return execTrx;
    } catch (e) {
        if (!(options.satisfyRequireApproval ?? false)) {
            expect(e.error.details[0].message).toContain('transaction authorization failed');
        } else {
            throw e;
        }
    }
}
