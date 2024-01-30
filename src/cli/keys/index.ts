import { PublicKey } from '@wharfkit/antelope';
import { generateRandomKeyPair } from '../../sdk';

export default async function keys(args: string[]) {
    if (args[0] === 'create') {
        console.log('Creating new key\n');

        const keyPair = generateRandomKeyPair();

        console.log('Public key: ', keyPair.publicKey.toString());
        console.log('Private key: ', keyPair.privateKey.toString());
    } else if (args[0] === 'convert') {
        console.log('Converting key formats\n');

        const publicKey = PublicKey.from(args[1]);

        console.log('Public key: ', publicKey.toString());
        console.log('Public key (legacy): ', publicKey.toLegacyString());
    } else {
        throw new Error(`Unknown command ${args[0]}`);
    }
}
