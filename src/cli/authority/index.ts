import { PublicKey, Name } from '@wharfkit/antelope';
import { Authority } from '../../sdk';

export function createAuthorityFromAccountArray(args: string[], permission: string, threshold = 1): Authority {
    if (!Name.pattern.test(args[0])) throw new Error(`Invalid account name ${args[0]}`);

    const authority = Authority.fromAccount({ actor: args[0], permission });

    if (args.length > 1) {
        for (const arg of args.slice(1)) {
            if (!Name.pattern.test(arg)) throw new Error(`Invalid account name ${arg}`);

            authority.addAccount({ actor: arg, permission });
        }
    }

    authority.setThreshold(threshold);

    return authority;
}

export default async function authority(args: string[]) {
    let authority: Authority;

    try {
        const publicKey = PublicKey.from(args[0]);

        authority = Authority.fromKey(publicKey.toString());
    } catch (e) {
        if (e.message === 'Invalid public key string') {
            const permission = 'owner';

            authority = createAuthorityFromAccountArray(args, permission);
        } else throw e;
    }

    console.log('Authority: ', JSON.stringify(authority));
}
