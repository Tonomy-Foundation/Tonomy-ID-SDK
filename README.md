# Tonomy ID SDK

This Software Development Kit is used in Tonomy ID to interact and call with the EOSIO blockchain and services. It is also used as the public API for integration by applications to do single sign-on, share credentials and sign transactions.

The SDK is written in typescript with jest to run tests.

## Dependencies

- Linux debian distribution (Ubuntu 20.0.4 LTS used)
- [Nodejs](https://nodejs.org) v16.4.1+ suggested installed with [nvm](https://github.com/nvm-sh/nvm)

Integration tests:

- [Docker](http://docs.docker.com) v20.10+

## Repositories

- [Contracts](https://github.com/Tonomy-Foundation/Tonomy-Contracts) (inside SDK repo) - Smart contracts to run the governance, identity, DAO, token and other ecosystem tools. This is used to run the integration tests

## Run

```bash
npm start
```

This builds to `/dist` and runs the project in watch mode so any edits you save inside `src` causes a rebuild to `/dist`.

To do a one-off build, use `npm run build`.

## Tests

### Unit tests:

Tests individual class and function logic within the SDK.

`npm test`

### Integration tests:

Tests end-to-end functions across more than one service.

Require another service to be running, such as the blockchain or Tonomy Communication service.

`./test-integration/build-and-run-tests.sh`

## Linting

Linting is done with `eslint`. Install the recommended VS Code plugin to see markers in your code.

```bash
npm run lint
```

## Error handling

See [errors.ts](./src/services/errors.ts). All errors have a registered unique enumeration code.

## Documentation

Documentation is in the `./docs` folder and runs with readthedocs.io here

<https://tonomy-id-sdk.readthedocs.io>

## To create a new App for SSO

Call

```bash
npx ts-node --project cli.tsconfig.json --transpileOnly id.ts appName username description logoUrl domain publicKey blockchainUrl
```

Example

```bash
npx ts-node --project cli.tsconfig.json --transpileOnly id.ts Netflix netflix "streaming video platform" "https://netflix.com/logo.png" "https://netflix.com" PUB_K1_55csjge6LNnLxECFTtTpCU6Z7chi3h47G8vyzPBjAKdvZmnZ8Z "http://localhost:8888"
```
