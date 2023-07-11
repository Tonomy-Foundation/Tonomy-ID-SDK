# Deploy a web wallet with the Tonomy SDK

The Tonomy SDK powers Tonomy ID to manage users keys. You can use it to create your own wallet (web or mobile) with a fully customized UI to suite your needs.

We suggest one of the following strategies:

## 1. Deploy a web version of the Tonomy ID wallet

Run <a href="https://github.com/Tonomy-Foundation/Tonomy-ID" target="_blank">Tonomy ID</a> and instead of compiling the Android and iOS applications, compile to web instead. Fork the repository to customize the UI.

## 2. Install the Tonomy SDK in your project

Install the <a href="https://github.com/Tonomy-Foundation/Tonomy-ID-SDK" target="_blank">Tonomy SDK</a> in your project and manage identities directly.

We suggest you familiarize yourself with how this is done in <a href="https://github.com/Tonomy-Foundation/Tonomy-ID" target="_blank">Tonomy ID</a> first and then to cherry pick the required flows for your use case.

See the <a href="https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/tree/master/src/sdk/controllers" target="_blank">controllers</a> in the SDK for the functions you will call in your wallet.
