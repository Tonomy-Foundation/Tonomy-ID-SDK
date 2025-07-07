import settings from '../settings';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { AccountType, isErrorCode, SdkErrors, TonomyUsername } from '../../sdk';
import { getAccount, getAccountNameFromUsername, TONO_CURRENT_PRICE } from '../../sdk/services/blockchain';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { Action } from '@wharfkit/antelope';

export async function vestingBulk(args: { governanceAccounts: string[] }, options: StandardProposalOptions) {
    const csvFilePath = '/home/dev/Downloads/allocate.csv';

    console.log('Reading file: ', csvFilePath);
    const sender = settings.isProduction() ? 'advteam.tmy' : 'team.tmy';
    const requiredAuthority = options.autoExecute ? args.governanceAccounts[2] : '11.found.tmy';
    const categoryId = 7; // Community and Marketing, Platform Dev, Infra Rewards
    // https://github.com/Tonomy-Foundation/Tonomy-Contracts/blob/master/contracts/vesting.tmy/include/vesting.tmy/vesting.tmy.hpp#L31

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
                let accountName = data.accountName as string;

                if (accountName.startsWith('@')) {
                    const usernameInstance = TonomyUsername.fromUsername(
                        accountName.split('@')[1],
                        AccountType.PERSON,
                        settings.config.accountSuffix
                    );

                    accountName = (await getAccountNameFromUsername(usernameInstance)).toString();
                } else {
                    await getAccount(accountName);
                }

                data.accountName = accountName;

                data.usdQuantity = Number(data.usdQuantity);

                if (isNaN(data.usdQuantity)) {
                    throw new Error(`Invalid quantity type on line ${results.length + 1}: ${data}`);
                }

                if (data.usdQuantity <= 0 || data.usdQuantity > 100000) {
                    throw new Error(`Invalid quantity on line ${results.length + 1}: ${data}`);
                }

                results.push(data);
            } catch (e) {
                if (isErrorCode(e, [SdkErrors.AccountDoesntExist, SdkErrors.UsernameNotFound])) {
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
        const tonoNumber = data.usdQuantity / TONO_CURRENT_PRICE;

        const tonoQuantity = tonoNumber.toFixed(0) + '.000000 TONO';

        console.log(
            `Assigning: ${tonoQuantity} ($${data.usdQuantity} USD) vested in category ${categoryId} to ${data.accountName} at rate of $${TONO_CURRENT_PRICE}/TONO`
        );
        return Action.from({
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
                amount: tonoQuantity,
                category: categoryId,
            },
        });
    });

    console.log(`Total ${actions.length} accounts to be paid`);

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        [requiredAuthority],
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
