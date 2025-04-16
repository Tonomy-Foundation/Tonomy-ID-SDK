# Antelope Sigining Request (ESR)

Antelope Signing Request (ESR) provides a standardized way for dApps to interact with wallets in the Antelope blockchain ecosystem. It allows developers to create portable, reusable signing requests for both transactions and identity verification.

We support Antelope Signing Requests for **Tonomy Mainnet** and **Tonomy Testnet**, with plans to add compatibility for EOS, Telos, and WAX in the future.

For detailed information about ESR, refer to the [Wharf Documentation.](https://wharfkit.com/docs/utilities/signing-request-library)

### Supported Feature

* **Identity Requests:** Request user identity in a secure, OAuth-like process.
* **Transaction Requests:** Send and manage blockchain transactions.

### Developer Resources

**Creating Identity and Transaction Requests**

For instructions on how to create login or transaction requests for your dApp, refer to the official [Wharfkit ESR Documentation.](https://wharfkit.com/docs/utilities/signing-request-library)

The documentation provides comprehensive examples and tools to help you craft signing requests tailored to your dApp’s requirements.

### Handling Signing Requests

When a signing request is received, the application detects it and triggers an event. Set up a listener to handle these events:

```typescript
import { SigningRequest } from 'eosio-signing-request';
import zlib from 'pako';

const signingRequestBasic = SigningRequest.from('esr://example', { zlib });
const client = new APIClient({ url: "https://pangea.eosusa.io" })

const options: SigningRequestEncodingOptions = {
   abiProvider: new ABICache(client) as unknown as AbiProvider,
   zlib,
};

// Decode a signing request payload
const signingRequest = SigningRequest.from(signingRequestBasic.toString(), options);

// Handle the request based on its type  
if (signingRequest.isIdentity()) {  
    handleIdentityRequest(request);  
} else {  
    handleTransactionRequest(request);  
} 
```

### Resolving a Request <a href="#resolving-a-request" id="resolving-a-request"></a>

Resolving a request involves transforming an Antelope Signing Request (ESR) into a fully populated transaction using the necessary ABIs, account authorizations, and blockchain data. This step prepares the request for signing and broadcasting to the blockchain.

```typescript
 const abis = await signingRequest.fetchAbis();

 const authorization = {
      actor: this.accountName,
      permission: 'active',
 };

 const info = await this.client.v1.chain.get_info();
 const header = info.getTransactionHeader();

 // Resolve the transaction using the supplied data
 const resolvedSigningRequest = await signingRequest.resolve(abis, authorization, header);
```

### Approving a Signing Request

The `approve` function handles the approval of an Antelope Signing Request (ESR). It resolves the transaction, signs it using the user's private key, and sends a callback to the dApp with the necessary payload.

The constructed payload is sent to the callback URL using an HTTP POST request.&#x20;

```typescript
const actions = this.resolvedSigningRequest.resolvedTransaction.actions
const transaction = await this.privateKey.signTransaction(actions);
const callbackParams = this.request.getCallback(transaction.signatures, 0); 

// Send the callback  
const response = await fetch(callbackParams.url, {  
    method: 'POST',  
    headers: { 'Content-Type': 'application/json' },  
    body: JSON.stringify(callbackParams.payload),  
});  
```

### Rejecting a Sigining Request

The `reject` method handles the rejection of a signing request. When a user decides not to proceed with a transaction, this method sends a callback to notify the originating dApp that the request was canceled.

A `POST` request is sent to the callback URL, informing the dApp that the request was rejected. The body of the request includes a clear message about the cancellation.

```typescript
const response = await fetch(origin, {  
    method: 'POST',  
    headers: {  
        'Content-Type': 'application/json',  
    },  
    body: JSON.stringify({  
        rejected: 'Request cancelled from within Anchor.',  
    }),  
});  
```
