import { KeyType, PrivateKey, PublicKey } from '@wharfkit/antelope';
import { bytesToMultibase, hexToBytes } from 'did-jwt';
import { DIDResolutionResult } from 'did-resolver';
import { SigningKey } from 'ethers';
import { getDidKeyResolver } from '@veramo/did-provider-key';
import { Resolver } from 'did-resolver';
import { Issuer } from 'did-jwt-vc';
import { createSigner } from '../crypto';

export async function toDidKey(publicKey: PublicKey): Promise<string> {
    // adapted from https://github.com/decentralized-identity/veramo/blob/next/packages/did-provider-key/src/key-did-provider.ts#L51
    if (publicKey.type !== KeyType.K1) throw new Error('Only K1 keys are supported');

    const publicKeyHexString = publicKey.data.toString('hex');
    const publicKeyHex = SigningKey.computePublicKey('0x' + publicKeyHexString, true);
    const methodSpecificId: string = bytesToMultibase(hexToBytes(publicKeyHex), 'base58btc', 'secp256k1-pub');

    return 'did:key:' + methodSpecificId;
}

export async function toDidKeyIssuer(privateKey: PrivateKey): Promise<Issuer> {
    const publicKey = privateKey.toPublic();
    const did = await toDidKey(publicKey);

    return {
        did,
        signer: createSigner(privateKey),
        alg: 'ES256K-R',
    };
}

export async function resolveDidKey(did: string): Promise<DIDResolutionResult> {
    const resolver = new Resolver({ ...getDidKeyResolver() });

    return resolver.resolve(did);
}
