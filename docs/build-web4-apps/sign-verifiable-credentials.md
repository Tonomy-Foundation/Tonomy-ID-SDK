# Sign Verifiable Credentials

Pangea ID enables users to **sign and verify W3C Verifiable Credentials** and **digitally sign documents** (e.g., PDFs) using their **self-sovereign identity**. This ensures **tamper-proof authentication** for **identity verification, attestations, and legally binding agreements**.

### Sign a W3C verifiable credential

```typescript
const vc = await user.signVc("https://example.com/example-vc/1234", "NameAndDob", {
    name: "Joe Somebody",
    dob: new Date('1999-06-04')
});

const verifiedVc = await vc.verify();
```

**Why use it?**

* Build **trust-based apps** requiring **proof of identity** or **qualifications**

### Sign a document

{% hint style="info" %}
**COMING SOON**\
(Support for document signing will be available in a future update.)
{% endhint %}
