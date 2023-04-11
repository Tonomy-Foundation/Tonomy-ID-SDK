# Integration

Tonomy SDK is primarily used to allow existing applications to support login through Tonomy ID. This is through a familiar [Single Sign-On](https://en.wikipedia.org/wiki/Single_sign-on) (SSO) flow like Google SSO

See a full example Reactjs website with Tonomy ID login here:

<https://demo.staging.tonomy.foundation/>

## Steps

1. Register your app to be able to login with Tonomy ID
2. Install in your application
3. Configure your `/login` page
4. Configure your `/callback` page

## 1. Register your app

First, you need to register your app with Tonomy ID. You can do this by running the following command:

```bash
npm run cli apps create appName username description logoUrl domain publicKey blockchainUrl

# example
npm run cli apps create Netflix netflix "streaming video platform" "https://netflix.com/logo.png" "https://netflix.com" PUB_K1_55csjge6LNnLxECFTtTpCU6Z7chi3h47G8vyzPBjAKdvZmnZ8Z "http://localhost:8888"
```

## 2. Install

```bash
npm i @tonomy/tonomy-id-sdk
```

## 3. Login page

To use the SDK, first import it:

```typescript
import { UserApps, setSettings } from '@tonomy/tonomy-id-sdk';

setSettings({ ssoWebsiteOrigin: "https://tonomy-id-staging.tonomy.foundation" });
...

async function onButtonPress() {
    ExternalUser.loginWithTonomy({ callbackPath: '/callback' });
}
```

We can call the function ``onButtonPress()`` in the login implementation:

```html
<button className="btn" onClick={onButtonPress}>Login with Tonomy ID</button>
```

## 4. Callback page

```typescript
import { SdkError, ExternalUser } from '@tonomy/tonomy-id-sdk';

...
useEffect(() => {
    verifyLogin();
}, []);

async function verifyLogin() {
    const user = await ExternalUser.verifyLoginRequest();

    // Get the account name
    const accountName = await user.getAccountName();

    // For example, you can now sign a transaction on the Antelope blockchain
    .. TODO
    const tx = await user.signTransaction({
        transaction: {
            to: 
        },
    });

    // For example, you can use the user's DID to sign a VC
    .. TODO
    const vc = await user.signCredential({
        credential: {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiableCredential'],
            issuer: user.did,
            issuanceDate: new Date().toISOString(),
            credentialSubject: {
                id: user.did,
                name: 'John Doe',
            },
        },
    });
}
```
