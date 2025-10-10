import { Name, PrivateKey, PublicKey } from '@wharfkit/antelope';
import { Authority, EosioUtil, getAccountInfo } from '../../sdk';
import { getTonomyEosioProxyContract, transact } from '../../sdk/services/blockchain';

export default async function auth(args: string[]) {
    if (args[0] === 'update') {
        const account = 'gov.tmy';
        const permission = 'active';

        const signer = [
            EosioUtil.createSigner(PrivateKey.from('')), // ops.tmy
            EosioUtil.createSigner(PrivateKey.from('')), // 1.found.tmy
            EosioUtil.createSigner(PrivateKey.from('')), // 2.found.tmy
        ];

        const accountInfo = await getAccountInfo(Name.from(account));
        const perm = accountInfo.getPermission(permission);
        const newAuthority = Authority.fromAccount({ actor: 'found.tmy', permission: 'active' });

        const action = getTonomyEosioProxyContract().actions.updateAuth({
            account,
            permission,
            parent: perm.parent,
            auth: newAuthority,
            authParent: true,
        });

        await transact(action, signer);
    } else if (args[0] === 'print') {
        let authority: Authority;

        try {
            const publicKey = PublicKey.from(args[0]);

            authority = Authority.fromKey(publicKey.toString());
        } catch (e) {
            if (e.message === 'Invalid public key string') {
                const permission = 'owner';

                authority = Authority.fromAccountArray(args, permission);
            } else throw e;
        }

        console.log('Authority: ', JSON.stringify(authority));
    } else {
        throw new Error(`Unknown command ${args[0]}`);
    }
}
