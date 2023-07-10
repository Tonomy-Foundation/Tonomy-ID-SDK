# Register your application

You need to register your application details so that they can be displayed to the user when they sign into your application.

## Creating a key

A private key is used to manage a Tonomy App. Save this key in a safe place.

```bash
npm run cli keys create
```

## Register a new Tonomy App

```bash
npm run cli apps create appName username description logoUrl domain publicKey blockchainUrl

# example
npm run cli apps create Netflix netflix "streaming video platform" "https://netflix.com/logo.png" "https://netflix.com" PUB_K1_55csjge6LNnLxECFTtTpCU6Z7chi3h47G8vyzPBjAKdvZmnZ8Z "http://localhost:8888"
```
