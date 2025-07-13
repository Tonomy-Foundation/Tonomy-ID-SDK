# Send P2P Messages

Tonomy ID supports **end-to-end encrypted messaging** using **DIDComm**, enabling **private, secure, and trustless communication** between users across different applications. This is ideal for **identity-based messaging, DAO coordination, and secure data exchanges**.

### Send a DIDComm Message

```typescript
const sender = await user.getIssuer();
const recipient = "did:antelope:66d565f72ac08f8321a3036e2d92eea7f96ddc90599bdbfc2d025d810c74c248:p32cba4hkut12#acsk3ht2ss32"

const msg = await Message.signMessage({ content: "Hello" }, sender, recipient);
await user.sendMessage(msg);
```

**Why use it?**

* Build **secure messaging into your app**.
* Communicate **privately across apps**.
