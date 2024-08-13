# Deploy a web wallet with the SDK

The Pangea SDK powers Pangea Passport to manage users keys. You can use it to create your own wallet (web or mobile) with a fully customized UI to suite your needs.

We suggest one of the following strategies:

## 1. Deploy a web version of the Pangea Passport wallet

Run [Pangea Passport](https://github.com/Tonomy-Foundation/Tonomy-ID/tree/master) and instead of compiling the Android and iOS applications, compile to web instead. Fork the repository to customize the UI.

Please [contact us](https://pangea.web4.world/contact-us) for assistance in deploying your bespoke solution.

## 2. Install the Pangea SDK in your project

Install the [Pangea SDK](https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/tree/master) in your project and manage identities directly.

How to use the SDK as a web wallet:

1. Choose a `KeyManager` class implementation:
   * [jsKeyManager](https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/blob/master/src/sdk/storage/jsKeyManager.ts) - for web browsers
   * [RNKeyManager](https://github.com/Tonomy-Foundation/Tonomy-ID/blob/master/src/utils/RNKeyManager.ts) - for React Native mobile apps
2. Choose a `Storage` class implementation:
   * [browserStorage](https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/blob/master/src/sdk/storage/browserStorage.ts) - for web browsers
   * [storage](https://github.com/Tonomy-Foundation/Tonomy-ID/blob/master/src/utils/storage.ts) - for React Native mobile apps
3. Create a new user. We suggest you familiarize yourself with how this is done by looking at the integration tests by checking the [User controller](https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/blob/master/test/helpers/user.ts) test which manages a Pangea Passport account and DID
4. Get the `KeyManager` object from the `User` object

```ts
const keyManager = user.keyManager;
```

5. Use the `keyManager` object for signatures. See the [signData()](https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/blob/master/src/sdk/storage/keymanager.ts) function in the interface for signing data.
