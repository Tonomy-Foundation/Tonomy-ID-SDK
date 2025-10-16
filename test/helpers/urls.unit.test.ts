import { parseCallbackPath, createUrl } from '../../src/sdk/helpers/urls';

describe('URLs helper functions', () => {
    describe('parseCallbackPath()', () => {
        it('parses callback path with query parameters and fragment', () => {
            const callbackPath = '/oauth/callback?code=abc123&state=xyz789#token=def456';
            const result = parseCallbackPath(callbackPath);

            expect(result.path).toBe('/oauth/callback');
            expect(result.params).toEqual({
                code: 'abc123',
                state: 'xyz789',
            });
            expect(result.fragment).toBe('token=def456');
        });

        it('parses callback path with only query parameters', () => {
            const callbackPath = '/auth/callback?userId=12345&redirect=/dashboard';
            const result = parseCallbackPath(callbackPath);

            expect(result.path).toBe('/auth/callback');
            expect(result.params).toEqual({
                userId: '12345',
                redirect: '/dashboard',
            });
            expect(result.fragment).toBe('');
        });

        it('parses callback path with only fragment', () => {
            const callbackPath = '/callback#access_token=abc123&expires_in=3600';
            const result = parseCallbackPath(callbackPath);

            expect(result.path).toBe('/callback');
            expect(result.params).toEqual({});
            expect(result.fragment).toBe('access_token=abc123&expires_in=3600');
        });

        it('parses simple path without parameters or fragment', () => {
            const callbackPath = '/simple/path';
            const result = parseCallbackPath(callbackPath);

            expect(result.path).toBe('/simple/path');
            expect(result.params).toEqual({});
            expect(result.fragment).toBe('');
        });
    });

    describe('createUrl()', () => {
        it('creates URL with base, path, parameters and fragment', () => {
            const base = 'https://example.com';
            const path = '/oauth/authorize';
            const params = {
                clientId: '12345',
                responseType: 'code',
                redirectUri: 'https://app.example.com/callback',
            };
            const fragment = 'section=login';

            const result = createUrl(base, path, params, fragment);

            expect(result).toBe(
                'https://example.com/oauth/authorize?clientId=12345&responseType=code&redirectUri=https%3A%2F%2Fapp.example.com%2Fcallback#section=login'
            );
        });

        it('creates URL with base and path only', () => {
            const base = 'https://api.tonomy.io';
            const path = '/v1/users';
            const params = {};
            const fragment = '';

            const result = createUrl(base, path, params, fragment);

            expect(result).toBe('https://api.tonomy.io/v1/users');
        });

        it('creates URL with parameters but no fragment', () => {
            const base = 'https://accounts.tonomy.io';
            const path = '/login';
            const params = {
                returnTo: 'https://app.tonomy.io/dashboard',
                theme: 'dark',
            };
            const fragment = '';

            const result = createUrl(base, path, params, fragment);

            expect(result).toBe(
                'https://accounts.tonomy.io/login?returnTo=https%3A%2F%2Fapp.tonomy.io%2Fdashboard&theme=dark'
            );
        });

        it('creates URL with fragment but no parameters', () => {
            const base = 'https://docs.tonomy.io';
            const path = '/integration';
            const params = {};
            const fragment = 'getting-started';

            const result = createUrl(base, path, params, fragment);

            expect(result).toBe('https://docs.tonomy.io/integration#getting-started');
        });
    });

    describe('parseCallbackPath() and createUrl() round trip', () => {
        it('should create and parse the same URL successfully', () => {
            const origin = 'https://example.com/';
            const callbackPath = '/oauth/callback?code=abc123&state=xyz789#token=def456';
            const { params, path, fragment } = parseCallbackPath(callbackPath);
            const payload = 'test_payload';

            const createdUrl = createUrl(origin, path, { ...params, payload }, fragment);

            expect(createdUrl).toBe(
                'https://example.com/oauth/callback?code=abc123&state=xyz789&payload=test_payload#token=def456'
            );
        });
    });
});
