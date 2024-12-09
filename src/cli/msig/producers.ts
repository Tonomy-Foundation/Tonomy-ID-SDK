import { getProducers } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { Name, PublicKey, Weight } from '@wharfkit/antelope';

// @ts-expect-error any not used
export async function addProd(args: any, options: StandardProposalOptions) {
    const producer = '1.found.tmy';
    const signingKey = PublicKey.from('EOS6A3TosyQZPa9g186tqVFa52AfLdkvaosy1XVEEgziuAyp5PMUj');

    const newSchedule = await getSchedule();

    if (newSchedule.find((p) => p.producer_name.equals(producer))) throw new Error('Producer already in the schedule');

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

    const action = createSetProdsAction(newSchedule);

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (proposalHash && options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

// @ts-expect-error any not used
export async function updateProd(args: any, options: StandardProposalOptions) {
    const producer = 'eosiodetroit';
    const signingKey = PublicKey.from('PUB_K1_7EyKQTyVABvDdmnS3VZceuqCCTTUZft6ZaPqbwZBYW8DFCxwKe');

    let newSchedule = await getSchedule();

    if (!newSchedule.find((p) => p.producer_name.equals(producer))) throw new Error('Producer not in the schedule');

    newSchedule = newSchedule.filter((p) => !p.producer_name.equals(producer));

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

    const action = createSetProdsAction(newSchedule);

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (proposalHash && options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

// @ts-expect-error any not used
export async function removeProd(args: any, options: StandardProposalOptions) {
    const producer = '1.found.tmy';

    // fetch the existing schedule and their keys
    let newSchedule = await getSchedule();

    if (!newSchedule.find((p) => p.producer_name.equals(producer))) throw new Error('Producer not in the schedule');

    newSchedule = newSchedule.filter((p) => !p.producer_name.equals(producer));

    const action = createSetProdsAction(newSchedule);

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (proposalHash && options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

// @ts-expect-error any not used
export async function changeProds(args: any, options: StandardProposalOptions) {
    const newProducers = [
        {
            producer: 'prod1.tmy',
            signingKey: PublicKey.from('PUB_K1_4uTNHX8hdWxyhYppW1pSESS9FeYP4nAipozUerQCTvXFwN9vq5'),
        },
        {
            producer: 'prod2.tmy',
            signingKey: PublicKey.from('PUB_K1_7THhTGLvEm5MB9YD1JEyDfQmpQtXhh2PXfY3vLtNJ72z7zZ7HN'),
        },
        {
            producer: 'prod3.tmy',
            signingKey: PublicKey.from('PUB_K1_56SRzctzrZTC5xtVnNYqS5kwVPxMi5QbTMZEQgpMrNFGatUrUX'),
        },
    ];

    const oldSchedule = await getSchedule();

    for (const { producer } of newProducers) {
        if (oldSchedule.find((p) => p.producer_name.equals(producer)))
            throw new Error('Producer already in the schedule');
    }

    const newSchedule = newProducers.map(({ producer, signingKey }) => {
        return {
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
        };
    });

    const action = createSetProdsAction(newSchedule);

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (proposalHash && options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

type Authority = {
    threshold: number;
    keys: {
        key: PublicKey;
        weight: Weight;
    }[];
};

interface ProducerSchedule {
    producer_name: Name;
    authority: (string | Authority)[];
}

async function getSchedule(): Promise<ProducerSchedule[]> {
    const { pending, proposed, active } = await getProducers();

    if (pending || proposed) throw new Error("Can't add a producer while there is a pending schedule");

    console.log('Fetched schedule:');

    for (const producer of active.producers) {
        console.log(
            `- ${producer.producer_name.toString().padEnd(13, ' ')} with signing key ${(producer.authority[1] as any).keys[0].key}`
        );
    }

    return active.producers.map((p) => {
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
}

function createSetProdsAction(schedule: ProducerSchedule[]) {
    console.log('New schedule:');

    for (const producer of schedule) {
        console.log(
            `- ${producer.producer_name.toString().padEnd(13, ' ')} with signing key ${(producer.authority[1] as any).keys[0].key}`
        );
    }

    return {
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
            schedule,
        },
    };
}
