# Login

Pangea ID allows **users to log in securely without passwords**, eliminating credential phishing risks and reducing login friction. This is ideal for **Web2 apps needing high-security authentication or privacy by default** and **Web3 apps requiring private key-based transaction authorization**.

### Before You Start

Ensure your app is registered with the Pangea network (See [Register Your Web4 App](register-app.md))

{% hint style="info" %}
For local testing, run your app on [http://localhost:3000](http://localhost:3000) and connect to the testnet
{% endhint %}

## 1. Configure network

Set your network at the start of your app (e.g., in `App.tsx` for React):

```typescript
import { setSettings } from '@tonomy/tonomy-id-sdk';

//Testnet Configuration
setSettings({
    ssoWebsiteOrigin: "https://accounts.testnet.pangea.web4.world",
    blockchainUrl: "https://blockchain-api-testnet.pangea.web4.world"
});

//Mainnet Configuration
setSettings({
    ssoWebsiteOrigin: "https://accounts.pangea.web4.world",
    blockchainUrl: "https://blockchain-api.pangea.web4.world"
});
```

## 2. Open Login Flow

This will open the Pangea ID app (via QR or deep link)

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
const user = await ExternalUser.verifyLoginRequest();
```
{% endcode %}

## 4. Persist User Session

Check user status when your app starts (e.g., in `App.tsx`):

```typescript
import { ExternalUser, SdkError, SdkErrors } from '@tonomy/tonomy-id-sdk';

async function checkSession() {
  try {
    const user = await ExternalUser.getUser();
    console.log('User session:', user);
  } catch (e) {
    if (e instanceof SdkError) {
      switch (e.code) {
        case SdkErrors.AccountNotFound:
        case SdkErrors.UserNotLoggedIn:
          console.log('User not logged in');
          break;
        default:
          console.error('Unexpected error:', e);
      }
    } else {
      console.error('Error fetching user:', e);
    }
  }
}

```
