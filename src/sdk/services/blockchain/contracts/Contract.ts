import { NameType, PermissionLevel, PermissionLevelType, Action } from '@wharfkit/antelope';
import { ContractKit, Contract as AntelopeContract } from '@wharfkit/contract';
import { getApi } from '../eosio/eosio';

function activeAuthorization(account: NameType): PermissionLevelType {
    return PermissionLevel.from({ actor: account, permission: 'active' });
}

export class Contract {
    contractName?: NameType;
    protected contract?: AntelopeContract;

    constructor(contractName?: NameType) {
        this.contractName = contractName;
    }

    static async atContract<T extends Contract>(this: new (name: NameType) => T, account: NameType): Promise<T> {
        const instance = new this(account);

        await instance.load();
        return instance;
    }

    protected async load(): Promise<void> {
        if (!this.contract) {
            const api = await getApi();
            const kit = new ContractKit({ client: api });

            if (!this.contractName) throw new Error('Contract name not set');
            this.contract = await kit.load(this.contractName);
        }
    }

    protected async getContract(): Promise<AntelopeContract> {
        await this.load();
        return this.contract as AntelopeContract;
    }

    protected async action(
        name: string,
        data: any,
        authorization: PermissionLevelType[] = [activeAuthorization(this.contractName as NameType)]
    ): Promise<Action> {
        const contract = await this.getContract();

        return contract.action(name, data, authorization);
    }
}

export { activeAuthorization };
