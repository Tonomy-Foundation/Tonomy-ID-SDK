import { Name } from '@wharfkit/antelope';
import { TonomyUsername } from './username';

export class WalletRequestResponse { }

export class LoginRequestResponse extends WalletRequestResponse {
    accountName: Name;

    constructor(accountName: Name) {
        super();
        this.accountName = accountName;
    }
}

export type DataSharingRequestResponseData = {
    username?: TonomyUsername;
};

export class DataRequestResponse extends WalletRequestResponse {
    data: {
        username?: TonomyUsername;
    };

    constructor(data: { username?: TonomyUsername }) {
        super();
        this.data = data;
    }
}
