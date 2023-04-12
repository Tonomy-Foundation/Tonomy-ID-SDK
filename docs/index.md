# Tonomy SDK

This Tonomy SDK has three components:

- [API](/api): application programming interface to manage single sign-on (SSO) and other interactions with Tonomy identities for web and mobile apps
- [CLI](/cli): command line interface to manage Tonomy Apps for use in SSO
- [SDK](/sdk): software development kit for building smart wallet applications like Tonomy ID

It manages all the business logic, cryptography and interactions between identities and applications.

## Installation

```bash
npm install @tonomy/tonomy-id-sdk
```

### Compatibility

The SDK has been tested with nodejs v18.12.1+.

### Sample Applications

Applications that illustrate how to use the SDK:

1. <a href="https://github.com/Tonomy-Foundation/Tonomy-App-Websites/tree/development/src/demo" target="_blank">Tonomy Demo (uses the API)</a>
2. <a href="https://github.com/Tonomy-Foundation/Tonomy-ID/tree/development" target="_blank">Tonomy ID smart wallet (uses the SDK)</a>
