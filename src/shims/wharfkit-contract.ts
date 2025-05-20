import { Action } from '@wharfkit/antelope';

export class ContractKit {
    client: any;
    constructor(options: { client: any }) {
        this.client = options.client;
    }
    async load(account: any): Promise<Contract> {
        const { abi } = await this.client.v1.chain.get_abi(account);

        return new Contract(abi, account);
    }
}
export class Contract {
    account: any;
    abi: any;
    actions: any;
    constructor(abi: any, account: any) {
        this.abi = abi;
        this.account = account;
        this.actions = {};
    }
    action(name: string, data: any, authorization: any[]): any {
        return Action.from({ account: this.account, name, authorization, data }, this.abi);
    }
}
