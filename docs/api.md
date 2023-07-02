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

See [Register a Tonomy App](/cli/#register-a-tonomy-app) using the CLI.

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

### Sign a blockchain transaction with one-click signature

**Step 1.** Modify your smart contract to accept signatures from users signed into your registered app (see [Register your app](/cli/#register-a-tonomy-app))

`eosio.token.cpp`

```c++
#include <id.tonomy/id.tonomy.hpp>

// TODO: make helper functions to fetch the App name exported from id.tonomy.hpp
const name get_app_permission_by_origin(string origin) {
    id::apps_table _apps = id::apps_table("id.tonomy"_n, ("id.tonomy"_n).value);
    auto apps_by_origin_hash_itr = _apps.get_index<"originhash"_n>();

    eosio::checksum256 origin_hash = eosio::sha256(origin.c_str(), std::strlen(origin.c_str()));
    const auto origin_itr = apps_by_origin_hash_itr.find(origin_hash);
    check(origin_itr == apps_by_origin_hash_itr.end(), "No app with this origin found");

    return origin_itr->account_name;
}

const name get_app_permission_by_username(string username) {
    id::apps_table _apps = id::apps_table("id.tonomy"_n, ("id.tonomy"_n).value);
    auto apps_by_username_hash_itr = _apps.get_index<"usernamehash"_n>();
    
    eosio::checksum256 username_hash = eosio::sha256(username.c_str(), std::strlen(username.c_str()));
    const auto username_itr = apps_by_username_hash_itr.find(username_hash);
    check(username_itr == apps_by_username_hash_itr.end(), "No app with this username found");

    return username_itr->account_name;
}

token::transfer(const name &from,
                        const name &to,
                        const asset &quantity,
                        const string &memo)
{
    require_auth({to, get_app_permission_by_origin("https://yourregisteredapp.com")});
    // or
    require_auth({to, get_app_permission_by_username("yourregisteredapp.apps.test.tonomy.id")});
    ...
}
```

**Step 2.** Use the SDK to sign the transaction

`SignTransaction.js`

```typescript
const trx = await user.signTransaction('eosio.token', 'transfer', {
    from: "me",
    to: "you",
    quantity: '1 SYS',
    memo: 'test memo',
});
```

### Sign a W3C verifiable credential with one-click signature

```typescript
const vc = await user.signVc("https://example.com/example-vc/1234", "NameAndDob", {
    name: "Joe Somebody",
    dob: new Date('1999-06-04')
});

const verifiedVc = await vc.verify();
```

### Send a peer-to-peer message to another Tonomy identity

```typescript
const msg = new Message.signMessage(
    { foo: "bar" }
    await user.getIssuer(),
    await user.getWalletDid()
);
await user.sendMessage(msg);
```
