# Register your application

You need to register your application details so that they can be displayed to the user when they sign into your application. This can currently only be done by an admin through the steps below. In the future, you can do this through the Pangea Build platform.

**Please reach out to the Tonomy Foundation's team on Discord, or contact us to set this up.**\
[https://pangea.web4.world/contact-us](https://pangea.web4.world/contact-us)





## Administrator Steps to Launch an App

You can currently do this with the Pangea CLI.

### Step 1. Creating a key

A private key is used to manage a Pangea App. Save this key in a safe place.

```bash
yarn run cli keys create
```

### Step 2: (Optional) Configure for a custom Pangea network

If you are using the a suuported network, skip this step.

Modify the `demoConfig` variable in `src/cli/bootstrap/settings.ts` to point to the correct Antelope blockchain API and use the right username suffix.

```js
{
    blockchainUrl: 'change me!!',
    accountSuffix: 'change me!!',
}
```

Run `yarn run build:cli`

### Step 3. Register a new Pangea App

Don't forget to set the NODE\_ENV and Tonomy Ops private key

```bash
export NODE_ENV=demo
export TONOMY_OPS_PRIVATE_KEY=PVT_K1_24kG9VcMk3VkkgY4hh42X262AWV18YcPjBTd2Hox4YWoP8vRTU

# yarn run cli apps create appName username description logoUrl domain publicKey
# example
yarn run cli apps create Netflix netflix "streaming video platform" "https://netflix.com/logo.png" "https://netflix.com" PUB_K1_55csjge6LNnLxECFTtTpCU6Z7chi3h47G8vyzPBjAKdvZmnZ8Z
```
