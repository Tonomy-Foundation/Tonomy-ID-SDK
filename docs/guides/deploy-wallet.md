# Deploy a web wallet with the Tonomy SDK

The Tonomy SDK powers Tonomy ID to manage users keys. You can use it to create your own wallet (web or mobile) with a fully customized UI to suite your needs.

We suggest one of the following strategies:

## 1. Deploy a web version of the Tonomy ID wallet

Run <a href="https://github.com/Tonomy-Foundation/Tonomy-ID" target="_blank">Tonomy ID</a> and instead of compiling the Android and iOS applications, compile to web instead. Fork the repository to customize the UI.

Please <a href="https://tonomy.io/contact" target="_blank">contact us</a> for assistance in deploying your bespoke solution.

## 2. Install the Tonomy SDK in your project

Install the <a href="https://github.com/Tonomy-Foundation/Tonomy-ID-SDK" target="_blank">Tonomy SDK</a> in your project and manage identities directly.

How to use the SDK as a web wallet:

1. Choose a `KeyManager` class implementation:

    - <a href="https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/blob/master/src/sdk/storage/jsKeyManager.ts" target="_blank">jsKeyManager</a> - for web browsers
    - <a href="https://github.com/Tonomy-Foundation/Tonomy-ID/blob/development/src/utils/RNKeyManager.ts" target="_blank">RNKeyManager</a> - for React Native mobile apps

2. Choose a `Storage` class implementation:

    - <a href="https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/blob/master/src/sdk/storage/browserStorage.ts" target="_blank">browserStorage</a> - for web browsers
    - <a href="https://github.com/Tonomy-Foundation/Tonomy-ID/blob/development/src/utils/storage.ts
" target="_blank">storage</a> - for React Native mobile apps

3. Create a new user. We suggest you familiarize yourself with how this is done by looking at the integration tests by checking the <a href="https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/blob/master/test-integration/helpers/user.ts#L22" target="_blank">User controller</a> test which manages a Tonomy ID account and DID

4. Get the `KeyManager` object from the `User` object

```ts
const keyManager = user.keyManager;
```

5. Use the `keyManager` object for signatures. See the <a href="https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/blob/master/src/sdk/storage/keymanager.ts" target="_blank">signData()</a> function in the interface for signing data.
