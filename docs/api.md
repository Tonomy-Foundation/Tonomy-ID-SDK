# Tonomy Application Programming Interface (API)

The Tonomy API allow existing applications to login and interact with Tonomy identities. This is through a familiar [Single Sign-On](https://en.wikipedia.org/wiki/Single_sign-on) (SSO) flow like with oAuth 2.0 or OpenIdConnect.

See a full example Reactjs website with Tonomy ID login here:

<a href="https://demo.staging.tonomy.foundation" target="_blank">Demo website</a>

## Login steps

Follow these steps to allow a Tonomy identity to log into your application.

1. Register your app to be able to login with Tonomy ID
2. Set the network
3. `/login` page
4. `/callback` page
5. `/` page to check for logged in users

Examples below are for a Reactjs website.

### 1. Register your app

See [/cli/#register-a-tonomy-app](/cli/#register-a-tonomy-app)

### 2. Set the network

```typescript
import { api } from '@tonomy/tonomy-id-sdk';

// Configure to use a specific network (in this case, the Tonomy staging network)
// Best to run this on the root app provider (e.g. App.tsx in Reactjs)
api.setSettings({
    ssoWebsiteOrigin: "https://tonomy-id-staging.tonomy.foundation",
    blockchainUrl: "https://blockchain-api-staging.tonomy.foundation"
});
```

### 3. Login page

```typescript
async function onButtonPress() {
    await api.ExternalUser.loginWithTonomy({ callbackPath: '/callback' });
}
```

```html
<button className="tonomy-login-button" onClick={onButtonPress}>Login with Tonomy ID</button>
```

#### Styling the Tonomy login button

To use the Tonomy login button styles, import the stylesheet and use the class `tonomy-login-button` on your button.

```typescript
import "@tonomy/tonomy-id-sdk/build/api/tonomy.css";
```

or

```html
<link href="https://unpkg.com/@tonomy/tonomy-id-sdk/build/api/tonomy.css" />
```

### 4. Callback page

```typescript
// call this when the page loads
// e.g. in useEffect() in Reactjs
const user = await api.ExternalUser.verifyLoginRequest();
```

### 5. Home page

```typescript
import { api, SdkError, SdkErrors } from '@tonomy/tonomy-id-sdk';

// call this when the page loads
// e.g. in useEffect() in Reactjs
let user;
try {
    user = await api.ExternalUser.getUser();
} catch (e) {
    if (e instanceof SdkError && e.code === SdkErrors.AccountNotFound) {
        // User has not logged in yet
    }
}
```

## User object API

With a logged in user you can do the following

### Get the account information

```typescript
const accountName = await user.getAccountName().toString();
```

### Get your DID

```typescript
const accountName = await user.getDid();
```

### Sign a blockchain transaction

TODO

### Sign a W3C verifiable credential

TODO

### Send a peer-to-peer message to another Tonomy identity

TODO
