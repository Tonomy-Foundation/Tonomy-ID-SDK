# Tonomy ID SDK

The Software Development Kit is used in the Tonomy ID ecosystems to interact with Tonomy identities and services.

It has four outputs:

- **SDK**: `./src/sdk` The SDK which acts as the business logic in Tonomy ID wallet. This is the main output.
- **API**: `./src/api` The API library used by integrators to interact with Tonomy ID users and to do single sign-on, share credentials and sign transactions.
- **Bootstrap CLI**: `./src/cli/bootstrap` A script used to intialize the blockchain with the Tonomy Contracts and starting accounts.
- **Apps CLI**: `./src/cli/apps` A CLI tool to create, update and delete Tonomy Apps.

The SDK is written in typescript with jest to run tests.

## Dependencies

- Linux debian distribution (Ubuntu 20.0.4 LTS used)
- [Nodejs](https://nodejs.org) v16.4.1+ suggested installed with [nvm](https://github.com/nvm-sh/nvm)

Integration tests:

- [Docker](http://docs.docker.com) v20.10+

## Repositories

- [Contracts](https://github.com/Tonomy-Foundation/Tonomy-Contracts) (inside SDK repo) - Smart contracts to run the governance, identity, DAO, token and other ecosystem tools. This is used to run the integration tests

## Build

`npm run build`

Build notes:

- Build just the sdk `npm run build:sdk`
- Build just the cli `npm run build:cli`
- Cli has dependency of `argon2` package, which is not needed by SDK and should be moved to a devDependency if these softwares are ever separated.

### Building a js bundle that can be used in a `<script>` tag

`microbundle --compress=false --external none -f umd -i ./src/api/index.ts -o build/api/index.js`

In theory, you can then use `<script src="./build/api/index.umd.js"></script>` which will provide a global `tonomyIdSdk` object.

But there are errors from the module management in `/node_modules/@tonomy/antelope-did-resolver/node_modules/eosjs` in the `/dist/eosjs-api-interfaces.js` and `/dist/eosjs-rpc-interfaces.js`. TODO this should be fixed.

For now an `{ api }` object is exported from the SDK which can be imported in any npm project.

## Run

```bash
npm start
```

This builds to `/dist` and runs the project in watch mode so any edits you save inside `src` causes a rebuild to `/dist`.

To do a one-off build, use `npm run build`.

## Tests

### Unit tests

Tests individual class and function logic within the SDK.

`npm test`

### Integration tests

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
