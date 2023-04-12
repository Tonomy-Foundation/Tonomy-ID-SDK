import { generateRandomKeyPair } from '../../sdk';

export default async function keys(args: string[]) {
    if (args[0] === 'create') {
        console.log('Creating new key\n');

        const keyPair = generateRandomKeyPair();

        console.log('Public key: ', keyPair.publicKey.toString());
        console.log('Private key: ', keyPair.privateKey.toString());
    } else {
        throw new Error(`Unknown command ${args[0]}`);
    }
}
