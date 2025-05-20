import { Name, NameType, PermissionLevel, PermissionLevelType, Action } from '@wharfkit/antelope';
import { ContractKit, Contract as AntelopeContract, ActionOptions } from '@wharfkit/contract';
import { getApi } from '../eosio/eosio';
import { MapObject } from '../../../util';

export function activePermissionLevel(account: NameType): PermissionLevelType {
    return PermissionLevel.from({ actor: account, permission: 'active' });
}

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

    constructor(contract: AntelopeContract) {
        this.contract = contract;
        this.contractName = contract.account;
    }

    protected action(
        name: NameType,
        data: MapObject,
        authorization: ActionOptions = { authorization: [activePermissionLevel(this.contractName)] }
    ): Action {
        return this.contract.action(name, data, authorization);
    }

    actions: ActionGetters;
}
