import { Web3 } from 'web3';
import { getSettings } from '../../sdk/util';

const web3 = new Web3(getSettings().web3Provider);

abstract class Transaction {
    protected data: any;

    constructor(data: any) {
        this.data = data;
    }

    abstract getOrCreateAccount(privateKey: string): Promise<string>;
    abstract signTransactionAndSendToNetwork(): Promise<string>;
}

export class EthereumTransaction extends Transaction {
    constructor(data: any) {
        super(data);
    }

    async getOrCreateAccount(privateKey?: string): Promise<string> {
        if (privateKey) {
            const account = web3.eth.accounts.privateKeyToAccount(privateKey.trim());

            return account?.address;
        } else {
            const account = web3.eth.accounts.create();

            web3.eth.defaultAccount = account.address;
            return account?.address;
        }
    }

    async signTransactionAndSendToNetwork(): Promise<string> {
        // Implementation specific to Ethereum network
        return 'EthereumTransactionID';
    }
}
