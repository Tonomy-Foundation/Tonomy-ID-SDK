import { getProducers } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { Name, PublicKey, Weight } from '@wharfkit/antelope';

// @ts-expect-error any not used
export async function addProd(args: any, options: StandardProposalOptions) {
    const producer = '1.found.tmy';
    const signingKey = PublicKey.from('EOS6A3TosyQZPa9g186tqVFa52AfLdkvaosy1XVEEgziuAyp5PMUj');

    // fetch the existing schedule and their keys
    const { pending, proposed, active } = await getProducers();

    if (pending || proposed) throw new Error("Can't add a producer while there is a pending schedule");

    if (active.producers.find((p) => p.producer_name.equals(producer)))
        throw new Error('Producer already in the schedule');

    const newSchedule = active.producers.map((p) => {
        return {
            // eslint-disable-next-line camelcase
            producer_name: p.producer_name,
            authority: [
                'block_signing_authority_v0',
                {
                    threshold: 1,
                    keys: p.authority[1].keys.map((k) => {
                        return {
                            key: k.key,
                            weight: k.weight,
                        };
                    }),
                },
            ],
        };
    });

    newSchedule.push({
        // eslint-disable-next-line camelcase
        producer_name: Name.from(producer),
        authority: [
            'block_signing_authority_v0',
            {
                threshold: 1,
                keys: [
                    {
                        key: signingKey,
                        weight: Weight.from(1),
                    },
                ],
            },
        ],
    });
    const action = {
        account: 'tonomy',
        name: 'setprods',
        authorization: [
            {
                actor: 'tonomy',
                permission: 'owner',
            },
            {
                actor: 'tonomy',
                permission: 'active',
            },
        ],
        data: {
            schedule: newSchedule,
        },
    };

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested
    );

    if (options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

// @ts-expect-error any not used
export async function removeProd(args: any, options: StandardProposalOptions) {
    const producer = '1.found.tmy';

    // fetch the existing schedule and their keys
    const { pending, proposed, active } = await getProducers();

    if (pending || proposed) throw new Error("Can't remove a producer while there is a pending schedule");

    if (!active.producers.find((p) => p.producer_name.equals(producer)))
        throw new Error('Producer not in the schedule');

    const newSchedule = active.producers
        .filter((p) => !p.producer_name.equals(producer))
        .map((p) => {
            return {
                // eslint-disable-next-line camelcase
                producer_name: p.producer_name,
                authority: [
                    'block_signing_authority_v0',
                    {
                        threshold: 1,
                        keys: p.authority[1].keys.map((k) => {
                            return {
                                key: k.key,
                                weight: k.weight,
                            };
                        }),
                    },
                ],
            };
        });

    const action = {
        account: 'tonomy',
        name: 'setprods',
        authorization: [
            {
                actor: 'tonomy',
                permission: 'owner',
            },
            {
                actor: 'tonomy',
                permission: 'active',
            },
        ],
        data: {
            schedule: newSchedule,
        },
    };

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested
    );

    if (options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
