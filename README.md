# Tonomy ID SDK

The Software Development Kit is used in the Tonomy ID ecosystems to interact with Tonomy identities and services.

It has four outputs:

- **SDK**: `./src/sdk` The SDK which acts as the business logic in Tonomy ID wallet. This is the main output.
- **API**: `./src/api` The API library used by integrators to interact with Tonomy ID users and to do single sign-on, share credentials and sign transactions. (currently bundled in the SDK package but intended for external bundle later. see <https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/pull/196#issuecomment-1497478858>)
- **Bootstrap CLI**: `./src/cli/bootstrap` A script used to initialize the blockchain with the Tonomy Contracts and starting accounts.
- **Apps CLI**: `./src/cli/apps` A CLI tool to create, update and delete Tonomy Apps.

The SDK is written in typescript with jest to run tests.

## Dependencies

- Linux debian distribution (Ubuntu 20.0.4 LTS used)
- [Nodejs](https://nodejs.org) v18.12.1+ suggested installed with [nvm](https://github.com/nvm-sh/nvm)

Integration tests:

- [Docker](http://docs.docker.com) v20.10+

## Repositories

- [Contracts](https://github.com/Tonomy-Foundation/Tonomy-Contracts) (inside SDK repo) - Smart contracts to run the governance, identity, DAO, token and other ecosystem tools. This is used to run the integration tests
- [Communication](https://github.com/Tonomy-Foundation/Tonomy-Communication) (inside SDK repo) - Service to provide peer-to-peer messaging for Tonomy ID users. This is used to run the integration tests

## Build

`npm run build`

Build notes:

- Build just the sdk `npm run build:sdk`
- Build just the cli `npm run build:cli`
  - Cli has dependency of `argon2` package, which is not needed by SDK and should be moved to a devDependency if these softwares are ever separated.

## Run

```bash
npm start
```

This builds to `/build` and runs the project in watch mode so any edits you save inside `src` causes a rebuild to `/build`.

To do a one-off build, use `npm run build`.

## Tests

### Unit tests

Tests individual class and function logic within the SDK.

`npm test:unit`

### Integration tests

Tests end-to-end functions across more than one service.

First run the blockchain or Tonomy Communication service locally.

`npm run test:setup`

Then run the tests

`npm run test:integration`

### Run all tests in the VS Code debugger

Make sure you install the Jest extension (recommended automatically when you open VS Code)

If you also want to do this with the integration tests then run `npm run test:setup` first

Then go to any test e.g. `test/app.test.ts` and you can click ▶️ or right click and press "Debug test". You can also look at the Jest Test Explorer in the left-side activity bar.

## Command line interface

`npm run cli`

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
