# Single Sign-On

1. Configuration - Set the network
2. `/login` page - add login button and send to Tonomy ID
3. `/callback` page - receive callback
4. `/` home page - check for logged in users

Examples below are for a Reactjs website.

## 1. Configuration - Set the network

Configure to use a specific network (in this case, the Tonomy demo network). Run this at the javascript root of your app (e.g. App.tsx in Reactjs) so they are set before used

```typescript
import { api } from '@tonomy/tonomy-id-sdk';

api.setSettings({
    ssoWebsiteOrigin: "https://accounts.demo.tonomy.foundation",
    blockchainUrl: "https://blockchain-api-demo.tonomy.foundation"
});
```

## 2. Login page

On your login page add the "Login with Tonomy ID" button and set it to call the `ExternalUser.loginWithTonomy` function when pressed. Set your `/callback` page path as shown below. This is where your  the user will be redirect to in your application, after they complete the login process.

```typescript
async function onButtonPress() {
    await api.ExternalUser.loginWithTonomy({ callbackPath: '/callback' });
}
```

```html
<button className="tonomy-login-button" onClick={onButtonPress}>Login with Tonomy ID</button>
```

### Request data sharing

During the login process, you can additionally request information from the user account by adding a `dataRequest` object when calling the `loginWithTonomy` function.

```typescript
await api.ExternalUser.loginWithTonomy({ callbackPath: '/callback', dataRequest: { username: true } });
```

Currently, only the `username` is able to be requested. We are working on supporting more data sharing options soon including basic personal information (name, date of birth, etc...) and sharing of data between applications.

### Styling the Tonomy login button

TODO: need to provide this in the gitbook docs

## 3. Callback page

In your `/callback` page, call the `ExternalUser.verifyLoginRequest()` function when the page renders. This will catch the login parameters from the URL and return a logged in user object.

```typescript
// call this when the page loads
// e.g. in useEffect() in Reactjs
const user = await api.ExternalUser.verifyLoginRequest();
```

## 4. Home page

On your home page or when your app first loads (App.tsx in reactjs), check if the user is already logged in.

```typescript
import { api, SdkError, SdkErrors } from '@tonomy/tonomy-id-sdk';

// call this when the page loads
// e.g. in useEffect() in Reactjs
try {
    const user = await api.ExternalUser.getUser();
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
