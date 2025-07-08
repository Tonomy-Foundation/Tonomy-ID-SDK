import { Name, NameType, Action } from '@wharfkit/antelope';
import { ContractKit, Contract as AntelopeContract, ActionOptions } from '@wharfkit/contract';
import { getApi } from '../eosio/eosio';
import { activeAuthority } from '../eosio/authority';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:blockchain:contracts:Contract');

export async function loadContract(account: NameType): Promise<AntelopeContract> {
    const kit = new ContractKit({ client: getApi() });

    return await kit.load(account);
}

export type ActionGetters = {
    [key: string]: (data: any, authorization?: ActionOptions) => Action;
};

export abstract class Contract {
    contractName: Name;
    contract: AntelopeContract;

    /**
     * Creates a new instance of the Contract class.
     *
     * @param {AntelopeContract} contract - The Antelope contract instance to use.
     * @param {boolean} [reload=false] - If true, reload the contract from the blockchain after instantiation (in case the abi has changed).
     */
    constructor(contract: AntelopeContract, reload = false) {
        this.contract = contract;
        this.contractName = contract.account;

        if (reload) {
            this.reloadContract();
        }
    }

    protected async reloadContract(): Promise<void> {
        try {
            this.contract = await loadContract(this.contractName);
        } catch (error) {
            console.error(`Failed to reload contract ${this.contractName}:`, error);
        }
    }

    /**
     * This should be overridden by subclasses to return the contract instance for a specific account.
     */
    // static async atAccount(account: NameType): Promise<Contract>;
    // static fromAbi(abi: any, account: NameType): Contract;

    protected action(
        name: NameType,
        data: any,
        authorization: ActionOptions = activeAuthority(this.contractName)
    ): Action {
        debug('action', name, data, authorization, this.contract.abi);
        return this.contract.action(name, data, authorization);
    }

    actions: ActionGetters;
}
