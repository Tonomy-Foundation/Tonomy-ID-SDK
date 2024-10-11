# Single Sign-On

1. Configuration - Set the network
2. `/login` page - add login button and send to Pangea Passport
3. `/callback` page - receive callback
4. `/` home page - check for logged in users

Examples below are for a Reactjs website.

## 1. Configuration - Set the network

Configure to use a specific network (in this case, the Pangea demo network). Run this at the javascript root of your app (e.g. App.tsx in Reactjs) so they are set before used

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

If you are getting an error about the fetch object like `TypeError: Failed to execute 'fetch' on 'Window'` you might also need to override the fetch object used by the SDK:

<pre class="language-typescript"><code class="lang-typescript"><strong>import { setFetch } from '@tonomy/tonomy-id-sdk';
</strong><strong>
</strong><strong>setFetch(window.fetch.bind(window));
</strong></code></pre>

## 2. Login page

On your login page set it to call the `ExternalUser.loginWithPangea` function when pressed. Set your `/callback` page path as shown below. This is where your the user will be redirect to in your application, after they complete the login process.

<pre class="language-typescript"><code class="lang-typescript"><strong>import { ExternalUser } from '@tonomy/tonomy-id-sdk';
</strong><strong>
</strong><strong>async function onButtonPress() {
</strong>    await ExternalUser.loginWithTonomy({ callbackPath: '/callback' });
}
</code></pre>

### Request data sharing

During the login process, you can additionally request information from the user account by adding a `dataRequest` object when calling the `loginWithPangea` function.

```typescript
await ExternalUser.loginWithTonomy({ callbackPath: '/callback', dataRequest: { username: true } });
```

Currently, only the `username` is able to be requested. We are working on supporting more data sharing options soon including basic personal information (name, date of birth, etc...) and sharing of data between applications.

## 3. Callback page

In your `/callback` page, call the `ExternalUser.verifyLoginRequest()` function when the page renders. This will catch the login parameters from the URL and return a logged in user object.

```typescript
// call this when the page loads
// e.g. in useEffect() in Reactjs
const user = await ExternalUser.verifyLoginRequest();
```

## 4. Home page

On your home page or when your app first loads (App.tsx in reactjs), check if the user is already logged in.

```typescript
import { ExternalUser, SdkError, SdkErrors } from '@tonomy/tonomy-id-sdk';

// call this when the page loads
// e.g. in useEffect() in Reactjs
try {
    const user = await ExternalUser.getUser();
} catch (e) {
    if (e instanceof SdkError) {
        switch (e.code) {
            case SdkErrors.AccountNotFound:
                // User has not logged in yet
            case SdkErrors.UserNotLoggedIn:
                // User logged in but key has expired. User needs to login again
            default:
                // unexpected error!
        }
    }
}
```
