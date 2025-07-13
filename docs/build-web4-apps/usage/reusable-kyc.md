# Reusable KYC

Tonomy ID allows **users to KYC by using existing digital IDs and KYC data, streamlining the flow** and reducing login friction. All KYC data is stored in the user's DataVault in their app, preving a breach even in the event a Tonomy server is breached. This is ideal for **apps needing economic, fast and secure KYC.**

**Why use it?**

* Build **KYC onboarding that is 10x faster than alternatives**.
* Save money with **reduced cost on re-use of KYC data**

### Before You Start

Read the [Login](single-sign-on.md) guide

## Configure your DataRequest during login

To request a user KYC, you just need to pass additional data during the login request:

{% code title="/login" %}
```typescript
import { ExternalUser } from '@tonomy/tonomy-id-sdk';

async function onButtonPress() {
    const dataRequest = { username: true, kyc: true };
    await ExternalUser.loginWithTonomy({ callbackPath: '/callback', dataRequest });
}
```
{% endcode %}

## Receive the KYC Data in the client

Receive the data when the user gets sent back to your callback function:

{% code title="/callback" %}
```typescript
const { user, data } = await ExternalUser.verifyLoginRequest();
console.log('KYC value', data.kyc.value)
console.log('KYC credential', data.kyc.verifiableCredential)
```
{% endcode %}

## Verify the credentials with your server

If you want to send the credentials to your server, send the `data.kyc.verifiableCredential` string to your server however you like (e.g. via a HTTP POST request).

### Client-side

{% code title="{{YOUR APP}}/callback" %}
```typescript
const kycString = data.kyc.verifiableCredential.toString();
// Send kycString to your server
```
{% endcode %}

### Server-side

You can then verify came from the Tonomy network in your server

{% code title="{{YOUR SERVER}}/verifications/receive" %}
```typescript
import { KYCVK, } from '@tonomy/tonomy-id-sdk';

// Receive the kycString from your client
const verifiableCredential = new KYCVC(kycstring);
const did = dataSharingResponse.data.kyc.getIssuer();
await verifyOpsTmyDid(did);
```
{% endcode %}

## Ephemeral & Peer-to-Peer Processing

One of the biggest advantages of Tonomy’s Reusable KYC is that you **don’t have to permanently store or manage sensitive KYC data if you don’t need to**. Instead, you can process it **ephemerally** — verifying the credential only when needed, then discarding it — or in some decentralized cases, not send it to your server at all.

However, **this is optional**. It’s important to understand your compliance requirements before deciding:

* ✅ **Some businesses (like centralized exchanges, banks, or payment processors)** are legally required to keep certain KYC data for audit and regulatory purposes. In these cases, you will still store verified credentials on your backend securely, just like traditional KYC providers.
* ✅ **Other businesses (like decentralized launchpads, P2P marketplaces, or dApps)** may not need to store any raw KYC data if local or ephemeral verification satisfies their risk and compliance model.

### How Ephemeral Server-Side Processing Works

If your compliance allows ephemeral processing:

1. The user consents and shares a **W3C Verifiable Credential** from their Tonomy ID.
2. Your server verifies the credential’s signature and the claims (e.g., “KYC = verified”).
3. You make an access decision or process the transaction.
4. You discard the credential immediately — it’s never stored long-term on your backend.

This minimises your security and compliance burden because **there is no sensitive KYC data to breach**.

### Peer-to-Peer & Local Verification

In fully decentralised or trustless models:

* Users can **prove their KYC status directly to each other** without the app storing or even seeing the raw credentials.
* Example: P2P marketplaces where buyers and sellers verify each other’s KYC in the client app.
* Example: Crypto launchpads that issue reusable KYC credentials, which users can present to new projects launching on the platform, with verification happening client-side.

In these cases, your platform acts as a KYC credential issuer, and users reuse their proof independently.
