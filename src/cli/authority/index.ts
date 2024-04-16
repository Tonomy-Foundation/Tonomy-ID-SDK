import { PublicKey } from '@wharfkit/antelope';
import { Authority } from '../../sdk';

export default async function authority(args: string[]) {
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
}
