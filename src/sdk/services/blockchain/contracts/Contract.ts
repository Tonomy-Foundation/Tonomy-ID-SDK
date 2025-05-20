import { Name, NameType, PermissionLevel, PermissionLevelType, Action } from '@wharfkit/antelope';
import { ContractKit, Contract as AntelopeContract } from '@wharfkit/contract';
import { getApi } from '../eosio/eosio';

export function activePermissionLevel(account: NameType): PermissionLevelType {
    return PermissionLevel.from({ actor: account, permission: 'active' });
}

const kitPromise = getApi().then((api) => new ContractKit({ client: api }));

export class Contract {
    contractName: Name;
    contract: AntelopeContract;

    constructor(contract: AntelopeContract) {
        this.contract = contract;
        this.contractName = contract.account;
    }

    static async atContract(account: NameType): Promise<Contract> {
        const contract = await (await kitPromise).load(account);

        return new this(contract);
    }

    protected async action(
        name: NameType,
        data: object,
        authorization = { authorization: [activePermissionLevel(this.contractName)] }
    ): Promise<Action> {
        return this.contract.action(name.toString(), data, authorization);
    }
}
