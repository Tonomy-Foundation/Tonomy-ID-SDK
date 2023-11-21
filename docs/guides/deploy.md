# Deploy Tonomy ID

Deployment of the full Tonomy ID involves several integrated services and is **expected to take several hours for someone not familiar with the system**

Please <a href="https://tonomy.io/contact" target="_blank">contact us</a> for assistance in your on-site deployment, or to help run a fully managed service with updates.

## Prerequisites

- Tonomy ID services run exclusively in `Linux`, we recommend Ubuntu 20.04 or 22.04.
- `npm` with `corepack enabled`, we recommend v18.12.1. Suggested to install with nvm v0.35+

## Services to run Tonomy ID

- Tonomy ID (React Native mobile wallet) - <a href="https://github.com/Tonomy-Foundation/Tonomy-ID" target="_blank">Github source</a>
- Tonomy Account Website (Reactjs) - <a href="https://github.com/Tonomy-Foundation/Tonomy-App-Websites" target="_blank">Github source</a>
- Blockchain and `id.tmy` smart contracts (Antelope protocol) - <a href="https://github.com/Tonomy-Foundation/Tonomy-Contracts" target="_blank">Github source</a>
- Tonomy Communication (nestjs) - <a href="https://github.com/Tonomy-Foundation/Tonomy-Communication" target="_blank">Github source</a>

## Deployment

### Locally

The easiest way is to use the automated scripts with the <a href="https://github.com/Tonomy-Foundation/Tonomy-ID-Integration" target="_blank">Tonomy-ID-Integration repository</a>

Check the `README.md` for dependencies and instructions.

```bash
git clone https://github.com/Tonomy-Foundation/Tonomy-ID-Integration
cd Tonomy-ID-Integration
./app.sh gitinit
./app.sh install
./app.sh init
./app.sh start
```

### On-site / cloud

We suggest that you look at the `./app.sh` and `./scripts/helpers.sh` files in the <a href="https://github.com/Tonomy-Foundation/Tonomy-ID-Integration" target="_blank">Tonomy-ID-Integration repository</a> to get an idea of how to run and bootstrap the network.

Read the `README.md` for each of the services before you start!

Then you will need to deploy each service, with configuration so that they connect with each other:

1. Deploy an and initialize an Antelope blockchain - see the <a href="https://docs.eosnetwork.com/docs/latest/node-operation/getting-started/" target="_blank">official Antelope node guide</a>

    - For a production grade network, we suggest 3 nodes if run by the same entity, or 5 nodes if run by separate entities
    - For maximum scaleability, run using bare-metal servers.
    - Please <a href="https://tonomy.io/contact" target="_blank">contact us</a> for assistance running a production Antelope network or setting up governance.

2. Create the `id.tmy` account on the blockchain
3. Deploy the <a href="https://github.com/Tonomy-Foundation/Tonomy-Contracts/tree/master/contracts/id.tmy" target="_blank">id.tmy</a> contract to the `id.tmy` account on the blockchain
4. [Register your applications](../../start/register-app) that you wish to connect to Tonomy ID
5. Configure the software with the `config.json` file in the repository so that they are connected correctly using your domains, and to white-label the applications:

    - Copy the following files and use environment variables to change which configuration file is used
    - <a href="https://github.com/Tonomy-Foundation/Tonomy-ID/blob/master/src/config/config.json" target="_blank">Tonomy ID config.json</a>
    - <a href="https://github.com/Tonomy-Foundation/Tonomy-App-Websites/blob/master/src/common/config/config.json" target="_blank">Tonomy App Websites config.json</a>
    - <a href="https://github.com/Tonomy-Foundation/Tonomy-Communication/blob/master/src/config/config.json" target="_blank">Tonomy Communication config.json</a>

6. Create a new Google Play store and Apple App store listing.
7. Use <a href="https://expo.dev" target="_blank">Expo</a> or <a href="https://expo.dev/eas" target="_blank">Expo Application Services</a> to build Tonomy ID and submit it to your app store listings.
8. Deploy <a href="https://github.com/Tonomy-Foundation/Tonomy-App-Websites" target="_blank">Tonomy App Websites</a>

    - You need to use the `accounts.` subdomain to run the Tonomy Accounts website
    - You need to use the `demo.` subdomain to run the Tonomy Demo website

9. Deploy <a href="https://github.com/Tonomy-Foundation/Tonomy-Communication" target="_blank">Tonomy Communication</a>

#### (Optional) Sign blockchain transactions in your apps

If you want to have your applications sign blockchain transactions, see [Sign a blockchain transaction](../../start/usage/#sign-a-blockchain-transaction) for how to configure your smart contracts.

#### (Optional) Run the [Demo website](../../examples/#tonomy-demo-integration-application)

To run the [Demo website](../../examples/#tonomy-demo-integration-application) in your network follow these extra steps:

1. [Register the application](../../start/register-app) using the domain you wish to run the Demo website from
2. Deploy the <a href="https://github.com/Tonomy-Foundation/Tonomy-Contracts/tree/master/contracts/eosio.token" target="_blank">eosio.token</a> contract to the `eosio.token` account (or modify the Demo website to connect to a different account)
3. Call `addperm()` function with the account name of the registered Demo application (Step 1)
4. Create dummy accounts as shown in the <a href="https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/blob/9061250ffceeddbbbf183a6ea03dfe7d5e1685c0/src/cli/bootstrap/bootstrap.ts#L88" target="_blank">bootstrap script here</a>
