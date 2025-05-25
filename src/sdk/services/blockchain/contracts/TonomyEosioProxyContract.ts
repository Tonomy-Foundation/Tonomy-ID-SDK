/* eslint-disable camelcase */
import { ABI, API, NameType, Serializer, Action, PermissionLevelType, AuthorityType } from '@wharfkit/antelope';
import { Contract, loadContract } from './Contract';
import { Contract as AntelopeContract, ActionOptions } from '@wharfkit/contract';
import { activeAuthority } from '../eosio/authority';
import { Signer, transact } from '../eosio/transaction';
import { GOVERNANCE_ACCOUNT_NAME } from './TonomyContract';
import { getApi } from '../eosio/eosio';
import abi from '../../../../../Tonomy-Contracts/contracts/tonomy/tonomy.abi.json';

const CONTRACT_NAME: NameType = 'tonomy';

const specialAccounts = ['eosio', 'eosio.token', 'tonomy', 'vesting.tmy', 'staking.tmy', 'tonomy'];

function getSpecialGovernancePermission(contractName: NameType): PermissionLevelType {
    if (specialAccounts.includes(contractName.toString())) {
        return { actor: GOVERNANCE_ACCOUNT_NAME, permission: 'owner' };
    }

    return { actor: contractName, permission: 'active' };
}

// Add special governance permission to the action authorization (if not already present)
function addSpecialGovernancePermission(auth: ActionOptions, contractName: NameType): ActionOptions {
    if (!auth.authorization) {
        auth.authorization = [];
    }

    const specialGovPermission = getSpecialGovernancePermission(contractName);

    if (
        !auth.authorization.some(
            (perm) =>
                perm.actor.toString() === specialGovPermission.actor.toString() &&
                perm.permission.toString() === specialGovPermission.permission.toString()
        )
    ) {
        auth.authorization.push(specialGovPermission);
    }

    return auth;
}

export class TonomyEosioProxyContract extends Contract {
    static async atAccount(account: NameType = CONTRACT_NAME): Promise<TonomyEosioProxyContract> {
        return new this(await loadContract(account));
    }

    static fromAbi(abi: any, account: NameType = CONTRACT_NAME): TonomyEosioProxyContract {
        const contract = new AntelopeContract({ abi, client: getApi(), account });

        return new this(contract, false);
    }

    actions = {
        setcode: (
            data: { account: NameType; vmtype: number; vmversion: number; code: string },
            auth: ActionOptions = addSpecialGovernancePermission(activeAuthority(data.account), data.account)
        ): Action => this.action('setcode', data, auth),
        setabi: (
            data: { account: NameType; abi: string },
            auth: ActionOptions = addSpecialGovernancePermission(activeAuthority(data.account), data.account)
        ): Action => this.action('setabi', data, auth),
        updateauth: (
            data: {
                account: NameType;
                permission: NameType;
                parent: NameType;
                auth: AuthorityType;
                authParent?: boolean;
            },
            auth: ActionOptions = addSpecialGovernancePermission(
                {
                    authorization: [
                        { actor: data.account, permission: data.authParent ? data.parent : data.permission },
                    ],
                },
                data.account
            )
        ): Action =>
            this.action(
                'updateauth',
                {
                    account: data.account,
                    permission: data.permission,
                    parent: data.authParent ? data.parent : data.permission === 'owner' ? '' : data.parent,
                    auth: data.auth,
                    auth_parent: data.authParent ?? false,
                },
                auth
            ),
        linkauth: (
            data: { account: NameType; code: NameType; type: NameType; requirement: NameType },
            auth: ActionOptions = activeAuthority(data.account)
        ): Action =>
            this.action(
                'linkauth',
                {
                    account: data.account,
                    code: data.code,
                    type: data.type,
                    requirement: data.requirement,
                },
                auth
            ),
        setpriv: (
            data: { account: NameType; isPriv: number },
            auth: ActionOptions = addSpecialGovernancePermission(activeAuthority(data.account), data.account)
        ): Action => this.action('setpriv', { account: data.account, is_priv: data.isPriv }, auth),
    };

    /** prepare setcode & setabi actions */
    async deployContractActions(
        account: NameType,
        wasmFileContent: Buffer,
        abiFileContent: Buffer,
        extraAuthorization?: PermissionLevelType
    ): Promise<Action[]> {
        const wasmHex = wasmFileContent.toString('hex');
        const abiJson = JSON.parse(abiFileContent.toString());
        const abiDef = ABI.from(abiJson);
        const abiHex = Serializer.encode({ object: abiDef }).hexString;

        const auth = activeAuthority(account);

        if (extraAuthorization) auth.authorization.push(extraAuthorization);

        const setCode = this.actions.setcode({ account, vmtype: 0, vmversion: 0, code: wasmHex }, auth);
        const setAbi = this.actions.setabi({ account, abi: abiHex }, auth);

        return [setCode, setAbi];
    }

    /** deploy via transact */
    async deployContract(
        account: NameType,
        wasmFileContent: Buffer,
        abiFileContent: Buffer,
        signer: Signer | Signer[],
        options: { extraAuthorization?: PermissionLevelType } = {}
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = await this.deployContractActions(
            account,
            wasmFileContent,
            abiFileContent,
            options?.extraAuthorization
        );

        return transact(actions, signer);
    }

    async updateauth(
        account: NameType,
        permission: NameType,
        parent: NameType,
        auth: AuthorityType,
        signer: Signer,
        options: { authParent?: boolean } = {}
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.updateauth({
            account,
            permission,
            parent,
            auth,
            authParent: options.authParent,
        });

        return transact([action], signer);
    }

    async linkAuth(
        account: NameType,
        code: NameType,
        type: NameType,
        requirement: NameType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.linkauth({ account, code, type, requirement });

        return transact([action], signer);
    }

    async setpriv(account: NameType, isPriv: number, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.setpriv({ account, isPriv });

        return transact([action], signer);
    }
}

export const tonomyEosioProxyContract = TonomyEosioProxyContract.fromAbi(abi);

export default async function loadTonomyEosioProxyContract(
    account: NameType = CONTRACT_NAME
): Promise<TonomyEosioProxyContract> {
    return await TonomyEosioProxyContract.atAccount(account);
}
