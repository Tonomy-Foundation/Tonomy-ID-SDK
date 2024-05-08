import { PublicKey, PrivateKey } from '@wharfkit/antelope';
import { generateRandomKeyPair } from '../../sdk';

export default async function keys(args: string[]) {
    if (args[0] === 'create') {
        console.log('Creating new key\n');

        const keyPair = generateRandomKeyPair();

        console.log('Public key: ', keyPair.publicKey.toString());
        console.log('Private key: ', keyPair.privateKey.toString());
    } else if (args[0] === 'convert') {
        console.log('Converting key formats\n');

        try {
            const publicKey = PublicKey.from(args[1]);

            console.log('Public key: ', publicKey.toString());
            console.log('Public key (legacy): ', publicKey.toLegacyString());
        } catch (e) {
            if (e.message === 'Checksum mismatch' || e.message === 'Invalid Base58 character encountered') {
                const privateKey = PrivateKey.from(args[1]);
                const publicKey = privateKey.toPublic();

                console.log('Private key: ', privateKey.toString());
                console.log('Private key (legacy): ', privateKey.toWif());
                console.log('Public key: ', publicKey.toString());
                console.log('Public key (legacy): ', publicKey.toLegacyString());
            } else throw e;
        }
    } else {
        throw new Error(`Unknown command ${args[0]}`);
    }
}
