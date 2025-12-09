# Login

Tonomy ID allows **users to log in securely without passwords**, eliminating credential phishing risks and reducing login friction. This is ideal for **Web2 apps needing high-security authentication or privacy by default** and **Web3 apps requiring private key-based transaction authorization**.

### Before You Start

Ensure your app is registered with the Tonomynetwork (See [Create Your App](../register-app.md))

{% hint style="success" %}
For local testing, run your app on [http://localhost:3000](http://localhost:3000) and connect to the **testnet**
{% endhint %}

## 1. Configure network

Set your network at the start of your app (e.g., in `App.tsx` for React):

```typescript
import { setSettings } from '@tonomy/tonomy-id-sdk';

//Mainnet Configuration
setSettings({
    ssoWebsiteOrigin: "https://accounts.testnet.tonomy.io",
    blockchainUrl: "https://pangea.eosusa.io",
    communicationUrl: "wss://communication.tonomy.io",
    currencySymbol: "TONO",
});

// Or use the Testnet Configuration
/*
setSettings({
    ssoWebsiteOrigin: "https://accounts.testnet.tonomy.io",
    blockchainUrl: "https://test.pangea.eosusa.io",
    communicationUrl: "wss://communication.testnet.tonomy.io",
    currencySymbol: "TONO",
});
*/
```

## 2. Open Login Flow

This will open the Tonomy ID app (via QR or deep link)

<pre class="language-typescript" data-title="/login"><code class="lang-typescript"><strong>import { ExternalUser } from '@tonomy/tonomy-id-sdk';
</strong><strong>
</strong><strong>async function onButtonPress() {
</strong>    await ExternalUser.loginWithTonomy({ callbackPath: '/callback' });
}
</code></pre>

### Request data sharing

Request user information by adding a `dataRequest` object.

<pre class="language-typescript" data-title="/login"><code class="lang-typescript"><strong>const dataRequest = { username: true };
</strong><strong>await ExternalUser.loginWithTonomy({ callbackPath: '/callback', dataRequest, });
</strong></code></pre>

## 3. Callback page

On your `/callback` page:

{% code title="/callback" %}
```typescript
const { user } = await ExternalUser.verifyLoginResponse();
```
{% endcode %}

## 4. Persist User Session

Check user status when your app starts (e.g., in `App.tsx`):

```typescript

import { ExternalUser, isErrorCode, SdkErrors } from '@tonomy/tonomy-id-sdk';
​
async function checkSession() {
  try {
    const user = await ExternalUser.getUser();
    console.log('User session:', user);
  } catch (e) {
    if (isErrorCode(e, [SdkErrors.AccountNotFound, SdkErrors.UserNotLoggedIn])) {
      console.log('User not logged in');
    } else {
      console.error('Error fetching user:', e);
    }
  }
}

```
