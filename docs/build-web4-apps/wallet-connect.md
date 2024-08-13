# Wallet Connect

Wallet Connect enables a seamless connection between your dAPP and a wallet. We setting up Wallet Connect for multichain transactions on **Ethereum, Ethereum Sepolia**, and **Polygon**. For detailed information and advanced configurations, refer to the [Wallet Connect documentation.](https://docs.walletconnect.com/)

### Supported features

* **Pairing**: Establishing a connection between a wallet and a dAPP.
* **Session Management**: Connecting, approving, rejecting, and disconnecting sessions.
* **Transaction Handling**: Sending and managing transactions.

### Pairing

&#x20;To establish a pairing, use the following code:

```
const uri = 'xxx'; // pairing uri
try {
    await web3wallet.core.pairing.pair({ uri })
} catch (error) {
    // catch error happens while pairing
}
```

### Session Management

When a dApp sends a session proposal to a wallet, it triggers a `session_proposal` event. To handle a `session_proposal` event, you need to set up an event listener and define the logic for processing the proposal.

```
web3wallet.on('session_proposal', onSessionProposal);
```

**Approve Session**

To approve a session proposal, construct the appropriate namespaces and call the `approveSession` method:

```
await web3wallet.approveSession({
    id: proposal.id,
    namespaces,
});
```

**Reject Session**

To reject a session proposal, use the `rejectSession` method, providing the session ID and a reason for the rejection:

```
import { getSdkError } from '@walletconnect/utils';

await web3wallet.rejectSession({
    id: proposal.id,
    reason: getSdkError('USER_REJECTED'),
});
```

### Transaction Handling

When a dApp sends a transaction request to a wallet, it triggers a `session_request` event. To handle this event, you need to set up an event listener and define the logic for processing the request.

```
web3wallet.on('session_request', onSessionRequest);
```

**Approve Transaction**

To approve a transaction request, construct the appropriate transaction details and call the `approveTransaction` method:

```
await web3wallet.respondSessionRequest({ topic: session.topic, response });
```

**Reject Transaction**

To reject a transaction request, use the `rejectTransaction` method, providing the request ID and a reason for the rejection:

```
import { getSdkError } from '@walletconnect/utils';

await web3wallet.rejectTransaction({
    id: proposal.id,
    reason: getSdkError('USER_REJECTED'),
});
```

