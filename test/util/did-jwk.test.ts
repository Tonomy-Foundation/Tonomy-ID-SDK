import { decodeJWT, verifyJWT } from '@tonomy/did-jwt';
import { resolve } from '../../src/util/did-jwk';

describe('did-jwk resolver', () => {
    const jwt =
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NkstUiJ9.eyJpYXQiOjE2Njk0NTkzNzgsIm51bWJlciI6ImE5MmRkNWQ3MmQ5NDAyMDNkNjRjZjJlYzRmY2Q3N2NjYzQyZjNkZWRlNDBiNjFiNmJiNDM2YzgyOGU0OTQ4MjUiLCJvcmlnaW4iOiJsb2NhbGhvc3QiLCJwdWJrZXkiOiJQVUJfSzFfODcyMmVnaWluYWE0bjIyZTZIQmNBQzlnaHpaOW5Qa2pqQzNwdFAxOWtoMzd4NzlwQ1YiLCJpc3MiOiJkaWQ6andrOmV5SmpjbllpT2lKelpXTndNalUyYXpFaUxDSnJkSGtpT2lKRlF5SXNJbmdpT2lKd05HeHBlR1YxUVZsSVVrVkVWR1JoYTJsR2NtTkliaXRSVkVVNE5DOVhRM0p4Unk5UmNqQkNkVmx6UFNJc0lua2lPaUoyVldOdVlTdDNhbGR2UWpoeWVGaElUVkJCV1V4UWN6RjRZbE14ZEZnMmMzSm1WRXBOVDBrclpHZEZQU0lzSW10cFpDSTZJbEJWUWw5TE1WODROekl5WldkcGFXNWhZVFJ1TWpKbE5raENZMEZET1dkb2VsbzVibEJyYW1wRE0zQjBVREU1YTJnek4zZzNPWEJEVmlKOSJ9.MW1J8SjTwSufE_n5fhPhhA9rjSY4MEbyD2WM-KswMNThGjK8tWOoRByrEZR8r_kl0mo7xe8zQDRG8NEwPKyiZwE';

    it('resolves correctly', () => {
        const decoded = decodeJWT(jwt);
        const DIDdocument = resolve(decoded.payload.iss);

        expect(DIDdocument).toBeDefined();
        expect(DIDdocument.id).toBeDefined();
        expect(DIDdocument.verificationMethod).toBeDefined();
        expect(DIDdocument.verificationMethod[0].id).toBeDefined();
        expect(DIDdocument.verificationMethod[0].type).toBe('JsonWebKey2020');
    });

    it('verifies created jwt', async () => {
        // TODO: add support JsonWebKey2020 for ES256K-R
        // eslint-disable-next-line @typescript-eslint/no-explicit-any

        const resolver: any = {
            resolve,
        };
        const verify = await verifyJWT(jwt, { resolver });

        expect(verify).toBeDefined();
    });
});
