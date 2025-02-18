# Troubleshooting

## Further support

Send us a message in the [Pangea Discord](https://discord.gg/8zDf8AF3ja):

* [#builders-discussion](https://discord.gg/Xyx8X5Jm2V) channel
* [#open-ticket](https://discord.gg/gws7AzEqVq) channel for anything sensitive

## Troubleshooting

### ESM-only compile = commonjs compilation is not supported

Pangea SDK uses pure ESM-compiled packages. You will not be able to consume the Pangea SDK in a common project such as a default nodejs or Jest compiler. Please change your compiler to target ESM.

* Ensure `"type": "module"` in `package.json`
* Use Nodejs ≥ 20.00

You may also need to set the environment variable `NODE_OPTIONS="--experimental-vm-modules"`&#x20;

**What is causing this?**

Our use of the [veramo.io](https://veramo.io/) libraries which use pure ESM components. See here: [https://discord.com/channels/878293684620234752/1200026960307437578/1249723788346785842](https://discord.com/channels/878293684620234752/1200026960307437578/1249723788346785842)

You can see here our journey to understand and upgrade all our repositories to pure ESM compilation: [https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/issues/336](https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/issues/336). You can see the specific changes we made and the typescript/jest compilation settings in our various Pangea infrastucture:

* **React native (mobile):** [https://github.com/Tonomy-Foundation/Tonomy-ID/pull/1055](https://github.com/Tonomy-Foundation/Tonomy-ID/pull/1055)
* **React app with Vite (website):** [https://github.com/Tonomy-Foundation/Tonomy-App-Websites/pull/288](https://github.com/Tonomy-Foundation/Tonomy-App-Websites/pull/288)
* **Nestjs (server):** [https://github.com/Tonomy-Foundation/Tonomy-Communication/pull/108](https://github.com/Tonomy-Foundation/Tonomy-Communication/pull/108)
* **SDK (typescript):** [https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/pull/396](https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/pull/396)

### yarn package management linking

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

