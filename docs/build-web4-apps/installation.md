# Getting Started

### Prerequisites

* **Node.js >= 20.0.0**
* **npm, or yarn ≥ 4.3.1**
* **pure ESM compiler (commonjs not supported)**

### Installation

The Tonomy SDK is a typescript enabled javascript library. Install with npm or yarn.

```bash
npm install @tonomy/tonomy-id-sdk
# or
yarn add @tonomy/tonomy-id-sdk
```

{% hint style="warning" %}
The Tonomy SDK is ESM-only. Set your package.json to "type": "module".

**Troubleshooting? See** [**ESM Migration Guide**](troubleshooting.md)**.**
{% endhint %}

### If using yarn v2+

When using yarn v2+ then you will need to also add the following to your `package.json` file.

```json
"resolutions": {
    "jsonld": "link:./node_modules/@digitalcredentials/jsonld"
  },
```

{% hint style="info" %}
See [Troubleshooting](../run-tonomy-infrastructure/troubleshooting.md) for other issues while compiling or executing the SDK.
{% endhint %}
