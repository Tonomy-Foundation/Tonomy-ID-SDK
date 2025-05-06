# Troubleshooting

### Pure ESM compile (Commonjs not supported)

We have adopted ESM syntax for the Tonomy codebase because of dependencies that we use that have taken a "pure ESM" stance.

You cannot consume the Tonomy SDK in a Commonjs project such as a default Node.js or Jest compiler.

Please change your compiler to target ESM.

* Ensure `"type": "module"` in `package.json`
* Use Nodejs ≥ 20.00

You may also need to set the environment variable `NODE_OPTIONS="--experimental-vm-modules"`&#x20;

**What is causing this?**

We use the [veramo.io](https://veramo.io/) libraries, which use pure ESM components. See [here](https://veramo.io/docs/troubleshooting#esm-vs-commonjs) for more details. Check out our [PRs to convert our codebases](updating-to-pure-esm.md) to pure-ESM.

### The `jsonld` ecosystem <a href="#the-jsonld-ecosystem" id="the-jsonld-ecosystem"></a>

The Tonomy library use the Verifiable Credentials libraries (like `@veramo/credential-ld`) which depend on a set of libraries from the `jsonld` ecosystem which weren't designed with the same multi-platform targets in mind. Forks of these dependencies exist, that work in all environments where Veramo should work, but you have to aid your package manager in finding them.

The solution is to add a `resolutions` (or `overrides`) block to your `package.json` file and replacing the problematic dependencies:

{% code title="package.json" %}
```json
"resolutions": {
    "jsonld": "link:./node_modules/@digitalcredentials/jsonld"
  },
```
{% endcode %}

Different package managers use different configurations for such overrides:

* [npm overrides](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides)
* [yarn v2+ resolutions](https://yarnpkg.com/configuration/manifest#resolutions)
* [yarn v1 resolutions](https://classic.yarnpkg.com/lang/en/docs/selective-version-resolutions/)
* [pnpm resolutions](https://pnpm.io/package_json#resolutions)

See the [veramo troubleshooting issue](https://app.gitbook.com/o/dC4MOhqSRqT71IybRRvq/s/lwtripGdFRg7UzTpWn7X/) for more details.

### React Native / Expo apps[​](https://veramo.io/docs/troubleshooting#react-native--expo-apps) <a href="#react-native--expo-apps" id="react-native--expo-apps"></a>

If your project is a react-native app, then you will also benefit from replacing `isomorphic-webcrypto` with the [fork maintained by Sphereon](https://github.com/Sphereon-Opensource/isomorphic-webcrypto)

{% code title="package.json" %}
```json
"resolutions": {
  "isomorphic-webcrypto": "npm:@sphereon/isomorphic-webcrypto@^2.4.0"
}
```
{% endcode %}

See the [veramo troubleshooting issue](https://app.gitbook.com/o/dC4MOhqSRqT71IybRRvq/s/lwtripGdFRg7UzTpWn7X/) for more details.

### yarn package management linking issues

Try use yarn with node-modules:

{% code title=".yarnrc.yml" %}
```yaml
nodeLinker: node-modules
```
{% endcode %}

### Error: Cannot read 'getResolver' of undefined

This has been observed in vite/quasar apps in development mode. To resolve see here: [https://github.com/decentralized-identity/ethr-did-resolver/issues/186#issuecomment-1870230086](https://github.com/decentralized-identity/ethr-did-resolver/issues/186#issuecomment-1870230086)

### TypeError: Failed to execute 'fetch' on 'Window'

You need to override the fetch object used by the SDK when your app loads. Do this at the same time as you call `setSettings()`

<pre class="language-typescript"><code class="lang-typescript"><strong>import { setFetch } from '@tonomy/tonomy-id-sdk';
</strong><strong>
</strong><strong>setFetch(window.fetch.bind(window));
</strong></code></pre>

## Further support

Send us a message in the [Tonomy Discord](https://discord.gg/8zDf8AF3ja):

* [#builders-discussion](https://discord.gg/Xyx8X5Jm2V) channel
* [#open-ticket](https://discord.gg/gws7AzEqVq) channel for anything sensitive
