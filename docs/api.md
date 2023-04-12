# Tonomy Application Programming Interface (API)

The Tonomy API allow existing applications to login and interact with Tonomy identities. This is through a familiar [Single Sign-On](https://en.wikipedia.org/wiki/Single_sign-on) (SSO) flow like with oAuth 2.0 or OpenIdConnect.

See a full example Reactjs website with Tonomy ID login here:

<a href="https://demo.staging.tonomy.foundation" target="_blank">Demo website</a>

## SSO Steps

Follow these steps to allow a Tonomy identity to log into your application.

1. Register your app to be able to login with Tonomy ID
2. Set the network
3. `/login` page
4. `/callback` page

### 1. Register your app

See [/cli/#register-a-tonomy-app](/cli/#register-a-tonomy-app)

### 2. Set the network

```typescript
import { api } from '@tonomy/tonomy-id-sdk';

// Configure to use a specific network (in this case, the Tonomy staging network)
api.setSettings({ ssoWebsiteOrigin: "https://tonomy-id-staging.tonomy.foundation" });
```

### 3. Login page

(Reactjs example)

```typescript
async function onButtonPress() {
    api.ExternalUser.loginWithTonomy({ callbackPath: '/callback' });
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
<link href="https://unpkg.com/@tonomy/tonomy-id-sdk/build/api/tonomy.css" ... >
```

### 4. Callback page

(Reactjs example)

```typescript
// call this function when the page loads
// e.g. in useEffect() in Reactjs
async function verifyLogin() {
    const user = await api.ExternalUser.verifyLoginRequest();
}
```
