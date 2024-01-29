# Usage and signing data

After you have a logged in `user` object from the callback or home page, you can do the following:

## User information

### Get the anonymous account ID

```typescript
const accountName = await user.getAccountName().toString();
```

### Get the username

```typescript
const username = await user.getUsername();
const shortUsername = username.getBaseUsername();
```

### Get the DID

```typescript
const accountDid = await user.getDid();
```

## Signatures

### Sign a W3C verifiable credential

```typescript
const vc = await user.signVc("https://example.com/example-vc/1234", "NameAndDob", {
    name: "Joe Somebody",
    dob: new Date('1999-06-04')
});

const verifiedVc = await vc.verify();
```

### Authenticate to your server

`client-authentication.ts`

```typescript
const vc = await user.signVc("https://example.com/user-authorization/1234", "UserAuth", {
    accountName: await user.getAccountName.toString()
});
```

`server-verification.ts`

```typescript
const verifiedVc = await vc.verify();
const userDid = vc.getIssuer();
// save userDid as the account unique user ID
```

You can also use the same flow above to send all requests, which adds integrity protection and non-repudiation to all requests to your server.

### Sign a document

TODO

### Sign a blockchain transaction

**Step 1.** Modify your [Antelope smart contract](../../guides/deploy/#antelope) to accept signatures from users signed into your registered app (see [Register your app](../../cli/#register-a-tonomy-app)). If you have deployed the smart contract to the same account as your App, then you can get the permission name with `get_self()`. If not, then you can use one of the Pangea helper functions to lookup the permission name with the origin or username.

`eosio.token.cpp`

```c++
#include <tonomy/tonomy.hpp>

token::transfer(const name &from,
                        const name &to,
                        const asset &quantity,
                        const string &memo)
{
    require_auth({from, get_self()})
    // or
    require_auth({from, tonomysystem::tonomy::get_app_permission_by_origin("https://your-registered-app.com")});
    // or
    require_auth({from, tonomysystem::tonomy::get_app_permission_by_username("your-registered-app.app.demo.tonomy.id")});
    ...
}
```

**Step 2.** Use the API to sign the transaction

```typescript
const trx = await user.signTransaction('eosio.token', 'transfer', {
    from: "me",
    to: "you",
    quantity: '1 SYS',
    memo: 'test memo',
});
```

## Sovereign storage vault

### Store data

TODO

### Request data

TODO

## Send a peer-to-peer message

```typescript
const msg = new Message.signMessage(
    { foo: "bar" }
    await user.getIssuer(),
    await user.getWalletDid()
);
await user.sendMessage(msg);
```
