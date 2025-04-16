# 1-Click Transactions

## 1-click transactions

Tonomy ID allows **users to sign and execute blockchain transactions** directly from your app without needing to open Tonomy ID.

These transactions have lower security guarantees than [wallet-signed transactions ](wallet-signing.md)and are good for low-value actions such as creation proposals, updating settings or game actions.

## **1.** Modify your Smart Contract

{% tabs %}
{% tab title="Smart contract @ Registered App account" %}
If you have deployed the smart contract to the same account as your [Registered App](../register-app.md), then you can get the permission name with `get_self()`.

{% code title="token.cpp" %}
```cpp
token::transfer(const name &from,
                        const name &to,
                        const asset &quantity,
                        const string &memo)
{
    require_auth({from, get_self()});
    // Rest of your code below...
}
```
{% endcode %}
{% endtab %}

{% tab title="Smart contract @ different account" %}
If your smart contract is deployed to a different account than your [Registered App](../register-app.md), then you can use a helper function to look up the permission name with the origin or username.

{% code title="token.cpp" %}
```cpp
#include <tonomy/tonomy.hpp>

token::transfer(const name &from,
                        const name &to,
                        const asset &quantity,
                        const string &memo)
{

    require_auth({from, tonomysystem::tonomy::get_app_permission_by_origin("https://your-registered-app.com")});
    // or
    require_auth({from, tonomysystem::tonomy::get_app_permission_by_username("your-registered-app.app.demo.tonomy.id")});
    // Rest of your code below...
}
```
{% endcode %}
{% endtab %}
{% endtabs %}

## **2.** Sign the Transaction in Your App

```typescript
const trx = await user.signTransaction('eosio.token', 'transfer', {
    from: "me",
    to: "you",
    quantity: '1 SYS',
    memo: 'test memo',
});
```

This will **directly sign the transaction** and send it to the blockchain **in the user's browser,** without them needing to open Tonomy ID. You may want to show a confirmation before, or after (such as with a Toast UI component).

{% hint style="info" %}
If the contract is deployed to the Registered App, then the transaction does not communicate with Tonomy ID. Otherwise, it will need to send a message to Tonomy ID the first time it does this transaction to the contract.
{% endhint %}

This will **prompt the user** to sign the transaction in their **Tonomy ID mobile app**.
