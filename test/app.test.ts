import { PrivateKey, PublicKey } from '@greymass/eosio';
import App from '../src/app';
import { generateRandomKeyPair } from '../src/util/crypto';
describe('logging in', () => {
    it('generates random key pair', () => {
        const { privateKey, publicKey } = generateRandomKeyPair();
        expect(privateKey).toBeInstanceOf(PrivateKey);
        expect(publicKey).toBeInstanceOf(PublicKey);
    });

    it('on press button', async () => {
        const jwt = await App.onPressLogin(window);
        expect(jwt).toBeDefined();
    });

    it('checks login url', async () => {
        const jwt =
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NkstUiJ9.eyJpYXQiOjE2Njk0NTkzNzgsIm51bWJlciI6ImE5MmRkNWQ3MmQ5NDAyMDNkNjRjZjJlYzRmY2Q3N2NjYzQyZjNkZWRlNDBiNjFiNmJiNDM2YzgyOGU0OTQ4MjUiLCJvcmlnaW4iOiJsb2NhbGhvc3QiLCJwdWJrZXkiOiJQVUJfSzFfODcyMmVnaWluYWE0bjIyZTZIQmNBQzlnaHpaOW5Qa2pqQzNwdFAxOWtoMzd4NzlwQ1YiLCJpc3MiOiJkaWQ6andrOmV5SmpjbllpT2lKelpXTndNalUyYXpFaUxDSnJkSGtpT2lKRlF5SXNJbmdpT2lKd05HeHBlR1YxUVZsSVVrVkVWR1JoYTJsR2NtTkliaXRSVkVVNE5DOVhRM0p4Unk5UmNqQkNkVmx6UFNJc0lua2lPaUoyVldOdVlTdDNhbGR2UWpoeWVGaElUVkJCV1V4UWN6RjRZbE14ZEZnMmMzSm1WRXBOVDBrclpHZEZQU0lzSW10cFpDSTZJbEJWUWw5TE1WODROekl5WldkcGFXNWhZVFJ1TWpKbE5raENZMEZET1dkb2VsbzVibEJyYW1wRE0zQjBVREU1YTJnek4zZzNPWEJEVmlKOSJ9.MW1J8SjTwSufE_n5fhPhhA9rjSY4MEbyD2WM-KswMNThGjK8tWOoRByrEZR8r_kl0mo7xe8zQDRG8NEwPKyiZwE';
        const url = 'http://localhost:3000/login?jwt=' + jwt;
        // Object.defineProperty(window.location, 'href', {
        //     writable: true,
        //     value: url,
        // });
        // eslint-disable-next-line prettier/prettier
        jsdom.reconfigure({ url: url });

        console.log(window.location.href);
        const payload = await App.onRedirectLogin();
        expect(payload).toBeDefined();
        expect(payload.number).toBe('a92dd5d72d940203d64cf2ec4fcd77ccc42f3dede40b61b6bb436c828e494825');
        expect(payload.pubkey).toBe('PUB_K1_8722egiinaa4n22e6HBcAC9ghzZ9nPkjjC3ptP19kh37x79pCV');
        expect(payload.origin).toBe('localhost');
    });
});
