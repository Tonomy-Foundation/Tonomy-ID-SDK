import settings from '../bootstrap/settings';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { SdkError, SdkErrors } from '../../sdk';
import { getAccount, getAccountNameFromUsername } from '../../sdk/services/blockchain';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

export async function vestingBulk(args: { governanceAccounts: string[] }, options: StandardProposalOptions) {
    const csvFilePath = '/home/dev/Downloads/allocate.csv';

    console.log('Reading file: ', csvFilePath);
    const sender = settings.isProduction() ? 'advteam.tmy' : 'team.tmy';
    const requiredAuthority = options.test ? args.governanceAccounts[2] : '11.found.tmy';
    const categoryId = 7; // Community and Marketing, Platform Dev, Infra Rewards
    const leosPrice = 0.002; // Seed early bird price
    // const leosPrice = 0.004; // Seed later comer price
    // const leosPrice = 0.012; // TGE price

    const records = parse(fs.readFileSync(csvFilePath, 'utf8'), {
        columns: true,
        // eslint-disable-next-line camelcase
        skip_empty_lines: true,
    });
    const results: { accountName: string; usdQuantity: number }[] = [];

    const unfoundAccounts: string[] = [];

    await Promise.all(
        records.map(async (data: any) => {
            // accountName, usdQuantity
            if (!data.accountName || !data.usdQuantity) {
                throw new Error(`Invalid CSV format on line ${results.length + 1}: ${data}`);
            }

            try {
                let accountName = data.accountName;

                try {
                    if (accountName.startsWith('@')) {
                        accountName = getAccountNameFromUsername(data.accountName);
                    }
                } finally {
                    // check the account exists. This will throw if not
                    await getAccount(accountName);
                }

                data.usdQuantity = Number(data.usdQuantity);

                if (isNaN(data.usdQuantity)) {
                    throw new Error(`Invalid quantity type on line ${results.length + 1}: ${data}`);
                }

                if (data.usdQuantity <= 0 || data.usdQuantity > 100000) {
                    throw new Error(`Invalid quantity on line ${results.length + 1}: ${data}`);
                }

                results.push(data);
            } catch (e) {
                if (e instanceof SdkError && e.code === SdkErrors.AccountDoesntExist) {
                    unfoundAccounts.push(data.accountName);
                } else {
                    throw e;
                }
            }
        })
    );

    if (unfoundAccounts.length > 0) {
        console.error(
            `${unfoundAccounts.length} accounts were not found in environment ${settings.env}:`,
            unfoundAccounts
        );
        process.exit(1);
    }

    const actions = results.map((data) => {
        const leosNumber = data.usdQuantity / leosPrice;

        const leosQuantity = leosNumber.toFixed(0) + '.000000 LEOS';

        console.log(
            `Assigning: ${leosQuantity} ($${data.usdQuantity} USD) vested in category ${categoryId} to ${data.accountName} at rate of $${leosPrice}/LEOS`
        );
        return {
            account: 'vesting.tmy',
            name: 'assigntokens',
            authorization: [
                {
                    actor: sender.toString(),
                    permission: 'active',
                },
            ],
            data: {
                sender,
                holder: data.accountName,
                amount: leosQuantity,
                category: categoryId,
            },
        };
    });

    console.log(`Total ${actions.length} accounts to be paid`);

    const proposalHash = await createProposal(options.proposer, options.proposalName, actions, options.privateKey, [
        requiredAuthority,
    ]);

    if (options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
