# Register your application

You need to register your application details so that they can be displayed to the user when they sign into your application. You can currently do this with the Pangea CLI. In the future you shall be able to do this through the Pangea Developer Console.

## Step 1. Creating a key

A private key is used to manage a Pangea App. Save this key in a safe place.

```bash
yarn run cli keys create
```

## Step 2: (Optional) Configure for a custom Pangea network

If you are using the Demo network, skip this step.

Modify the `demoConfig` variable in `src/cli/bootstrap/settings.ts` to point to the correct Antelope blockchain API and use the right username suffix.

```js
{
    blockchainUrl: 'change me!!',
    accountSuffix: 'change me!!',
}
```

Run `yarn run build:cli`

## Step 3. Register a new Pangea App

```bash
export NODE_ENV=demo
yarn run cli apps create appName username description logoUrl domain publicKey blockchainUrl

# example
export NODE_ENV=demo
yarn run cli apps create Netflix netflix "streaming video platform" "https://netflix.com/logo.png" "https://netflix.com" PUB_K1_55csjge6LNnLxECFTtTpCU6Z7chi3h47G8vyzPBjAKdvZmnZ8Z "http://localhost:8888"
```
