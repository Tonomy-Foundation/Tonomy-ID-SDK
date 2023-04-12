# Tonomy Command Line Interface (CLI)

The Tonomy CLI is used to create and manage Tonomy Apps that can interact with Tonomy identities.

This is a temporary solution while we build the Tonomy Developer Console where Tonomy Apps can be managed through a web interface.

## Creating a key

A private key is used to manage a Tonomy App

```bash
npm run cli keys create
```

## Register a Tonomy App

```bash
npm run cli apps create appName username description logoUrl domain publicKey blockchainUrl

# example
npm run cli apps create Netflix netflix "streaming video platform" "https://netflix.com/logo.png" "https://netflix.com" PUB_K1_55csjge6LNnLxECFTtTpCU6Z7chi3h47G8vyzPBjAKdvZmnZ8Z "http://localhost:8888"
```
