import { Name } from '@wharfkit/antelope';
import { TonomyUsername } from './username';

export class TonomyRequestResponse { }

export class LoginRequestResponse extends TonomyRequestResponse {
    accountName: Name;

    constructor(accountName: Name) {
        super();
        this.accountName = accountName;
    }
}

export type DataSharingRequestResponseData = {
    username?: TonomyUsername;
};

export class DataRequestResponse extends TonomyRequestResponse {
    data: {
        username?: TonomyUsername;
    };

    constructor(data: { username?: TonomyUsername }) {
        super();
        this.data = data;
    }
}
