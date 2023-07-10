# Tonomy SDK

The Tonomy SDK manages all the business logic, cryptography and interactions between identities and applications.

**Tonomy ID - White Paper**:
<https://www.canva.com/design/DAFnktNOWKU/Ps1zXw3XICaEMiB0R4Ghkg/view>

## Installation

```bash
npm install @tonomy/tonomy-id-sdk
# or
yarn add @tonomy/tonomy-id-sdk
```

## Usage

- [Interact with identities](/api): API to manage single sign-on (SSO) and other interactions with Tonomy identities such as signature requests, transactions and messaging for web and mobile apps
- [Manage SSO Applications](/cli): CLI to manage Tonomy Apps for use in SSO
- [Build smart wallets](/sdk): SDK for building smart wallet applications like Tonomy ID

### Compatibility

The SDK has been tested with nodejs v18.12.1+.

### Demo Applications

Applications that illustrate how to use the SDK:

1. <a href="https://github.com/Tonomy-Foundation/Tonomy-App-Websites/tree/master/src/demo" target="_blank">Tonomy Demo (uses the API)</a>
2. <a href="https://github.com/Tonomy-Foundation/Tonomy-ID/tree/master" target="_blank">Tonomy ID smart wallet (uses the SDK)</a>
