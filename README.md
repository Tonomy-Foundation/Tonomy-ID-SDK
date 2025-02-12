# Tonomy ID SDK

The Software Development Kit is used in the Tonomy ID ecosystems to interact with Tonomy identities and services.

**See <https://docs.pangea.web4.world> for documentation.**

The SDK is written in typescript with jest to run tests.

## Dependencies

- Linux debian distribution (Ubuntu 20.0.4 LTS used)
- [Nodejs](https://nodejs.org) v20+ suggested installed with [nvm](https://github.com/nvm-sh/nvm)

Integration tests:

- [Docker](http://docs.docker.com) v20.10+

## Sub-Repositories

- [Contracts](https://github.com/Tonomy-Foundation/Tonomy-Contracts) (inside SDK repo) - Smart contracts to run the governance, identity, DAO, token and other ecosystem tools. This is used to run the integration tests
- [Communication](https://github.com/Tonomy-Foundation/Tonomy-Communication) (inside SDK repo) - Service to provide peer-to-peer messaging for Tonomy ID users. This is used to run the integration tests

## Build

`yarn run build`

Build notes:

- Build just the sdk `yarn run build:sdk`
- Build just the cli `yarn run build:cli`
  - TODO: cli has dependency of `argon2` package, which is not needed by SDK and should be moved to a devDependency if these softwares are ever separated.

## Run

```bash
yarn start
```

This builds to `/build` and runs the project in watch mode so any edits you save inside `src` causes a rebuild to `/build`.

To do a one-off build, use `yarn run build`.

### Unit tests

Tests individual class and function logic within the SDK.

`yarn test:unit`

### Integration tests

Tests end-to-end functions across more than one service.

First make sure that contracts are complied with the BUILD_TEST flag:

```bash
export BUILD_TEST=true
./Tonomy-Contracts/delete-built-contracts.sh
./Tonomy-Contracts/build_contracts.sh
```

Then run the blockchain or Tonomy Communication service locally.

`yarn run test:setup`

Then run the tests

`yarn run test:integration`

### Governance tests

Tests the governance of the system. Can only be run once before a blockchain reset is required.

First run the blockchain or Tonomy Communication service locally.

`yarn run test:setup`

Then run the tests

`yarn run test:governance`

### Run all tests in the VS Code debugger

Make sure you install the Jest extension (recommended automatically when you open VS Code)

If you also want to do this with the integration tests then run `yarn run test:setup` first

Then go to any test e.g. `test/app.test.ts` and you can click ▶️ or right click and press "Debug test". You can also look at the Jest Test Explorer in the left-side activity bar.

## Command line interface

`yarn run cli`

### Bootstrapping

`yarn run cli bootstrap`

Environment variables are required to bootstrap the network. These values are provided by default in test and develpment environments but must be provided externally for non-dev environments:

- `TONOMY_OPS_PRIVATE_KEY`: the private key of the operations account that will be used for the tonomy@active account.
- `TONOMY_BOARD_PUBLIC_KEYS`: the public keys (in JSON array format) of the network governance multi-signature account that controls governance operations
- `TONOMY_TEST_ACCOUNTS_PASSPHRASE`: the passphrase that will be used for the App store test user and demo app users

## Linting

Linting is done with `eslint`. Install the recommended VS Code plugin to see markers in your code.

```bash
yarn run lint
```

## Error handling

See [errors.ts](./src/services/errors.ts). All errors have a registered unique enumeration code.

## Debugging

Uses [debug](https://www.npmjs.com/package/debug) package. Use `export DEBUG="tonomy*"` to see all debug logs.
