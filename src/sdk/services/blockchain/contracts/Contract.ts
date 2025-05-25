import { Name, NameType, Action } from '@wharfkit/antelope';
import { ContractKit, Contract as AntelopeContract, ActionOptions } from '@wharfkit/contract';
import { getApi } from '../eosio/eosio';
import { MapObject } from '../../../util';
import { activeAuthority } from '../eosio/authority';

export async function loadContract(account: NameType): Promise<AntelopeContract> {
    const kit = new ContractKit({ client: await getApi() });

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
            loadContract(this.contractName)
                .then((loadedContract) => {
                    this.contract = loadedContract;
                })
                .catch((error) => {
                    console.error(`Failed to reload contract ${this.contractName}:`, error);
                });
        }
    }

    /**
     * This should be overridden by subclasses to return the contract instance for a specific account.
     */
    // static async atAccount(account: NameType): Promise<Contract>;

    protected action(
        name: NameType,
        data: MapObject,
        authorization: ActionOptions = activeAuthority(this.contractName)
    ): Action {
        return this.contract.action(name, data, authorization);
    }

    actions: ActionGetters;
}
