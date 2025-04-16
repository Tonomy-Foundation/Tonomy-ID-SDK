# Server Authentication

Tonomy SDK allows apps to **authenticate users to their backend servers** without relying on **centralized identity providers**. This provides **cryptographic proof-of-identity** for **secure API requests, data access, and user actions**.

### Client-side

```typescript
const jwt = await user.createClientAuthorization({
    username: await user.getUsername(),
    foo: "bar"
});
// Securely send the jwt string to your server
```

### Server-side

```typescript
import { verifyClientAuthorization } from '@tonomy/tonomy-id-sdk'

// receive JWT string from the client
const verifiedUser = await verifyClientAuthorization(jwt);
```

You can also use the same flow above to send all requests, which adds integrity protection and non-repudiation to all requests to your server.

**Why use it?**

* **Proof-of-Identity** for **backend actions** (e.g., payments, data storage)
* **Non-repudiation**: **Know exactly which user made the request**
