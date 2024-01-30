# Deploy Pangea Passport

Deployment of the full Pangea Passport involves several integrated services and is **expected to take several hours for someone not familiar with the system**

Please [contact us](https://tonomy.io/contact) for assistance in your on-site deployment, or to help run a fully managed service with updates.

## Prerequisites

* Pangea Passport services run exclusively in `Linux`, we recommend Ubuntu 20.04 or 22.04.
* `npm` with `corepack enabled`, we recommend v18.12.1. Suggested to install with nvm v0.35+

## Services to run Pangea Passport

* Pangea Passport (React Native mobile wallet) - [Github source](https://github.com/Tonomy-Foundation/Tonomy-ID)
* Pangea Account Website (Reactjs) - [Github source](https://github.com/Tonomy-Foundation/Tonomy-App-Websites)
* Blockchain and `id.tmy` smart contracts (Antelope protocol) - [Github source](https://github.com/Tonomy-Foundation/Tonomy-Contracts)
* Pangea Communication (nestjs) - [Github source](https://github.com/Tonomy-Foundation/Tonomy-Communication)

## Deployment

### Locally

The easiest way is to use the automated scripts with the [Tonomy-ID-Integration repository](https://github.com/Tonomy-Foundation/Tonomy-ID-Integration)

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

We suggest that you look at the `./app.sh` and `./scripts/helpers.sh` files in the [Tonomy-ID-Integration repository](https://github.com/Tonomy-Foundation/Tonomy-ID-Integration) to get an idea of how to run and bootstrap the network.

Read the `README.md` for each of the services before you start!

Then you will need to deploy each service, with configuration so that they connect with each other:

1. Deploy an and initialize an Antelope blockchain - see the [official Antelope node guide](https://docs.eosnetwork.com/docs/latest/node-operation/getting-started/)
   * For a production grade network, we suggest 3 nodes if run by the same entity, or 5 nodes if run by separate entities
   * For maximum scaleability, run using bare-metal servers.
   * Please [contact us](https://tonomy.io/contact) for assistance running a production Antelope network or setting up governance.
2. Create the `eosio.token` account on the blockchain
3. Deploy the [eosio.token](https://github.com/Tonomy-Foundation/Tonomy-Contracts/tree/master/contracts/eosio.token) contract to the `eosio.token` account on the blockchain
4. Create a new currency with a total supply using the `create()` function
5. Issue a specific amount of the newly created currency to the 'eosio.token' account using the `issue()` function
6. Create the `id.tmy` account on the blockchain
7. Deploy the [id.tmy](https://github.com/Tonomy-Foundation/Tonomy-Contracts/tree/master/contracts/id.tmy) contract to the `id.tmy` account on the blockchain
8. [Register your applications](../start/register-app.md) that you wish to connect to Pangea Passport
9. Configure the software with the `config.json` file in the repository so that they are connected correctly using your domains, and to white-label the applications:
   * Copy the following files and use environment variables to change which configuration file is used
   * [Pangea Passport config.json](https://github.com/Tonomy-Foundation/Tonomy-ID/blob/master/src/config/config.json)
   * [Pangea App Websites config.json](https://github.com/Tonomy-Foundation/Tonomy-App-Websites/blob/master/src/common/config/config.json)
   * [Pangea Communication config.json](https://github.com/Tonomy-Foundation/Tonomy-Communication/blob/master/src/config/config.json)
10. Create a new Google Play store and Apple App store listing.
11. Use [Expo](https://expo.dev) or [Expo Application Services](https://expo.dev/eas) to build Pangea Passport and submit it to your app store listings.
12. Deploy [Pangea App Websites](https://github.com/Tonomy-Foundation/Tonomy-App-Websites)
    * You need to use the `accounts.` subdomain to run the Pangea Accounts website
    * You need to use the `demo.` subdomain to run the Pangea Demo website
13. Deploy [Pangea Communication](https://github.com/Tonomy-Foundation/Tonomy-Communication)

#### (Optional) Sign blockchain transactions in your apps

If you want to have your applications sign blockchain transactions, see [Sign a blockchain transaction](../../start/usage/#sign-a-blockchain-transaction)[ ](../start/usage.md)for how to configure your smart contracts.

#### (Optional) Run the [Demo website](<../README (1).md>)

To run the [Demo website](../../examples/#tonomy-demo-integration-application)[ ](<../README (1).md>)in your network follow these extra steps:

1. [Register the application](../../start/register-app/) using the domain you wish to run the Demo website from
2. Deploy the [demo.tmy](https://github.com/Tonomy-Foundation/Tonomy-Contracts/tree/master/contracts/demo.tmy) contract to the `demo.tmy` account (or modify the Demo website to connect to a different account)
3. Call `addperm()` function with the account name of the registered Demo application (Step 1)
4. Create dummy accounts as shown in the [bootstrap script here](https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/blob/9061250ffceeddbbbf183a6ea03dfe7d5e1685c0/src/cli/bootstrap/bootstrap.ts#L88)
