import { ES256KSigner, decodeJWT, verifyJWT } from 'did-jwt';
import { VerificationMethod } from 'did-resolver';
import { resolve } from '../../../src/sdk/util/ssi/did-jwk';
import {
    LoginRequest,
    SdkErrors,
    base64UrlToObj,
    generateRandomKeyPair,
    randomString,
    setSettings,
    throwError,
} from '../../../src/sdk';
import { toDid, createJWK, toDidDocument } from '../../../src/sdk/util/ssi/did-jwk';
import { VerifiableCredential } from '../../../src/sdk/util/ssi/vc';
// import { base64ToBytes } from 'did-jwt';
// import { secp256k1 } from '@noble/curves/secp256k1';
// // import { bytesToBigInt } from 'did-jwt/lib/util';
// import * as u8a from 'uint8arrays';

// export function bytesToBigInt(b: Uint8Array): bigint {
//     return BigInt(`0x` + u8a.toString(b, 'base16'));
// }

const createRandomJwkIssuer = async () => {
    const { privateKey, publicKey } = generateRandomKeyPair();

    const signer = ES256KSigner(privateKey.data.array, true);
    const jwk = await createJWK(publicKey);

    return {
        did: toDid(jwk),
        signer: signer as any,
        alg: 'ES256K-R',
    };
};

describe('did-jwk resolver', () => {
    const jwt =
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NkstUiJ9.eyJpYXQiOjE2Njk0NTkzNzgsIm51bWJlciI6ImE5MmRkNWQ3MmQ5NDAyMDNkNjRjZjJlYzRmY2Q3N2NjYzQyZjNkZWRlNDBiNjFiNmJiNDM2YzgyOGU0OTQ4MjUiLCJvcmlnaW4iOiJsb2NhbGhvc3QiLCJwdWJrZXkiOiJQVUJfSzFfODcyMmVnaWluYWE0bjIyZTZIQmNBQzlnaHpaOW5Qa2pqQzNwdFAxOWtoMzd4NzlwQ1YiLCJpc3MiOiJkaWQ6andrOmV5SmpjbllpT2lKelpXTndNalUyYXpFaUxDSnJkSGtpT2lKRlF5SXNJbmdpT2lKd05HeHBlR1YxUVZsSVVrVkVWR1JoYTJsR2NtTkliaXRSVkVVNE5DOVhRM0p4Unk5UmNqQkNkVmx6UFNJc0lua2lPaUoyVldOdVlTdDNhbGR2UWpoeWVGaElUVkJCV1V4UWN6RjRZbE14ZEZnMmMzSm1WRXBOVDBrclpHZEZQU0lzSW10cFpDSTZJbEJWUWw5TE1WODROekl5WldkcGFXNWhZVFJ1TWpKbE5raENZMEZET1dkb2VsbzVibEJyYW1wRE0zQjBVREU1YTJnek4zZzNPWEJEVmlKOSJ9.MW1J8SjTwSufE_n5fhPhhA9rjSY4MEbyD2WM-KswMNThGjK8tWOoRByrEZR8r_kl0mo7xe8zQDRG8NEwPKyiZwE';

    it('resolves correctly', async () => {
        const decoded = decodeJWT(jwt);
        const DIDdocument = await resolve(decoded.payload.iss);

        expect(DIDdocument).toBeDefined();
        expect(DIDdocument.didDocument?.id).toBeDefined();
        const verificationMethod = (DIDdocument.didDocument?.verificationMethod as VerificationMethod[])[0];

        expect(verificationMethod).toBeDefined();
        expect(verificationMethod.id).toBeDefined();
        expect(verificationMethod.type).toBe('JsonWebKey2020');
    });

    it('verifies created jwt', async () => {
        expect.assertions(1);

        // TODO: add support JsonWebKey2020 for ES256K-R
        // eslint-disable-next-line @typescript-eslint/no-explicit-any

        const resolver: any = {
            resolve,
        };
        const verify = await verifyJWT(jwt, { resolver });

        expect(verify).toBeDefined();
    });

    it('creates a jwt and verifies it 100 times', async () => {
        expect.assertions(100);

        for (let i = 0; i < 100; i++) {
            const issuer = await createRandomJwkIssuer();
            const id = randomString(10);
            const bar = randomString(10);

            const jwt = await VerifiableCredential.sign<{ foo: string }>(
                'did:example.id:' + id,
                ['VerifiableCredential'],
                { foo: 'bar' + bar },
                issuer
            );

            const result = await jwt.verify();

            expect(result.verified).toBe(true);
        }
    });
});

describe('invalid payload', () => {
    setSettings({});

    // Based on UserApps.getLoginRequestFromUrl()
    function payloadToRequests(base64UrlPayload: string): { requests: LoginRequest[] } {
        const parsedPayload = base64UrlToObj(base64UrlPayload);

        if (!parsedPayload || !parsedPayload.requests)
            throwError('No requests found in payload', SdkErrors.MissingParams);

        const loginRequests = parsedPayload.requests.map((r: string) => new LoginRequest(r));

        return { requests: loginRequests };
    }

    // from did-jwt/src/VerifierAlgorithm.ts
    // function extractPublicKeyBytes(pk: VerificationMethod): Uint8Array {
    //     if (pk.publicKeyJwk && pk.publicKeyJwk.crv === 'secp256k1' && pk.publicKeyJwk.x && pk.publicKeyJwk.y) {
    //         return secp256k1.ProjectivePoint.fromAffine({
    //             x: bytesToBigInt(base64ToBytes(pk.publicKeyJwk.x)),
    //             y: bytesToBigInt(base64ToBytes(pk.publicKeyJwk.y)),
    //         }).toRawBytes(false);
    //     } else {
    //         throw 'Unsupported public key format';
    //     }
    // }

    it('should throw an error on an invalid payload', async () => {
        const payload =
            'eyJyZXF1ZXN0cyI6WyJleUpoYkdjaU9pSkZVekkxTmtzdFVpSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKa2FXUTZhbmRyT21WNVNtcGpibGxwVDJsS2VscFhUbmROYWxVeVlYcEZhVXhEU25Ka1NHdHBUMmxLUmxGNVNYTkpibWRwVDJsS05HUnJUbmRYYTFaWVVWaHNiRll3TVVST00yZ3lUa04wVlZwVk9VNVpNbVJDWVRCMFZsUlhkRVZqYTNoTFpGWkNkMDB5VW01VldHTTVVRk5KYzBsdWEybFBhVXBPV2xack1GVllTazFaVm5BMFkyNWFXbFZ0VmpOak1teFZUREZTY0dWRk9UWk9NazVIVVd4T05FNVdSblZVTWtwUFRrTTVVRTVYVW01UVUwbHpTVzEwY0ZwRFNUWkpiRUpXVVd3NVRFMVdPREJsV0dnMFZsVTFNMVJWTlcxVlIwWkpUMVJHV1dOdVpHeE5lbWd6VmpGTk5GRXhValpaZWxwWFdUSnNWbGRIVGxGVVNGWjNZekJLVmxreVVsSmhXRzgwVGtOS09TSXNJbXAwYVNJNkltaDBkSEJ6T2k4dmRHOXViMjE1TG1admRXNWtZWFJwYjI0dmRtTXZhV1F2WkRReFl6VTBaVE13TmpFNFltSXdNMlUwTURNaUxDSnVZbVlpT2pFMk9ETTRNVFF5T1RRc0luWmpJanA3SWtCamIyNTBaWGgwSWpwYkltaDBkSEJ6T2k4dmQzZDNMbmN6TG05eVp5OHlNREU0TDJOeVpXUmxiblJwWVd4ekwzWXhJbDBzSW1OeVpXUmxiblJwWVd4VGRXSnFaV04wSWpwN0luQmhlV3h2WVdRaU9uc2lZMkZzYkdKaFkydFFZWFJvSWpvaUwyTmhiR3hpWVdOcklpd2liM0pwWjJsdUlqb2lhSFIwY0Rvdkx6RXdMak14TGpFeUxqRTFORG96TURBeElpd2ljSFZpYkdsalMyVjVJam9pVUZWQ1gwc3hYelI1ZUhoVlRuZE5UbVpRWVVnNU1WaHlkMlV6T0hkWFV6aERWSHBqTmxaamFWVllZMUJNZFhCelFsVmpaRkZwZWpnMElpd2ljbUZ1Wkc5dFUzUnlhVzVuSWpvaVltWTJaVEptWVRsbU16STRZV1l5TWpObU1ERmtZalJsWkdNd01UUXlZbVE0TVRFeE1qY3haR015WlRjek1qYzJaRFl4Tm1JME9XRmpPV0ppWkRRM09DSjlMQ0owZVhCbElqb2lURzluYVc1U1pYRjFaWE4wSW4wc0luUjVjR1VpT2xzaVZtVnlhV1pwWVdKc1pVTnlaV1JsYm5ScFlXd2lMQ0pVYjI1dmJYbFdaWEpwWm1saFlteGxRM0psWkdWdWRHbGhiRmRwZEdoVWVYQmxJbDE5ZlEuamt4NEp3enY4TVdrQUt3aEJ0c1BESnlsNDNpcGVRWHM0OHZEWHNVdVFWMGVJQklWTXh3VkNJM0VZM2JHOU1tblhZQTBCS1pPVWJ0QkpNYXo0dnhxWkFFIl19';

        const { requests } = payloadToRequests(payload);

        const myRequest = requests.find((r) => r.getPayload().origin === 'http://10.31.12.154:3001');

        expect(myRequest).toBeDefined();

        try {
            const verifiedRequest = await myRequest?.verify();

            expect(verifiedRequest).toBeDefined();
        } catch (e: any) {
            expect(e).toBeDefined();
            expect(e?.message?.startsWith('invalid_signature')).toBe(true);
        }
    });

    // it('should fail to extract bytes of the public key', async () => {
    //     // JWK from the payload
    //     const jwk = {
    //         id: '#0',
    //         type: 'JsonWebKey2020',
    //         controller:
    //             'did:jwk:eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJ4dkNwWkVXQXllV01DN3h2NCtUZU9NY2dBa0tVTWtEckxKdVBwM2RnUXc9PSIsInkiOiJNZVk0UXJMYVp4cnZZUmV3c2lUL1RpeE96N2NGQlN4NVFuT2JONC9PNWRnPSIsImtpZCI6IlBVQl9LMV80eXh4VU53TU5mUGFIOTFYcndlMzh3V1M4Q1R6YzZWY2lVWGNQTHVwc0JVY2RRaXo4NCJ9',
    //         publicKeyJwk: {
    //             crv: 'secp256k1',
    //             kty: 'EC',
    //             x: 'xvCpZEWAyeWMC7xv4+TeOMcgAkKUMkDrLJuPp3dgQw==',
    //             y: 'MeY4QrLaZxrvYRewsiT/TixOz7cFBSx5QnObN4/O5dg=',
    //             kid: 'PUB_K1_4yxxUNwMNfPaH91Xrwe38wWS8CTzc6VciUXcPLupsBUcdQiz84',
    //         },
    //     };

    //     const bytes = extractPublicKeyBytes(jwk);
    // });
});
