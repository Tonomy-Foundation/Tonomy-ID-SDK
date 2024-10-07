# Installation

The Pangea SDK is a typescript enabled javascript library. Install with npm or yarn.

```bash
npm install @tonomy/tonomy-id-sdk
# or
yarn add @tonomy/tonomy-id-sdk
```

### Notes for yarn v2+

If using yarn v2+ then you will need to also add the following to your `package.json` file.

```json
"resolutions": {
    "jsonld": "link:./node_modules/@digitalcredentials/jsonld"
  },
```

## Compatibility

The Tonomy SDK requires `odejs v20+`
