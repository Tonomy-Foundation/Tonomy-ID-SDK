# Create your App

Before integrating the Tonomy SDK on **mainnet** and **testet**, your app must be registered. This ensures your app is recognized during user logins and transactions.

For **local testing**, developers can run their app on [https://localhost:3000](https://localhost:3000/) and use the testnet SDK configuration. If so, the _steps on the rest of this page can be ignored_

### Step 1. Generate App Key

Save the generated private key safely.

{% tabs %}
{% tab title="No-code" %}
Go to [https://tonomy.foundation/generate-key](https://tonomy.foundation/generate-key/)

[<sub>_Source code_</sub>](https://github.com/Tonomy-Foundation/Tonomy-Foundation-Next-Website/blob/master/pages/generate-key.js)
{% endtab %}

{% tab title="Run code yourself" %}
{% hint style="success" %}
You will need to run on a Linux machine with a bash-like terminal with:

* Node v20+
* Docker
{% endhint %}

```bash
git clone https://github.com/Tonomy-Foundation/Tonomy-ID-SDK.git
cd Tonomy-ID-SDK

# (optional) enable corepack (for yarn) if not done already
corepack enable

yarn
yarn run build
yarn run cli keys create
```
{% endtab %}
{% endtabs %}



### Step 2. Submit App Details

To register your app on both **testnet** and **mainnet**, please fill out the following form with the required details:&#x20;

📋 **Submit here:** [Tonomy App Registration Form](https://docs.google.com/forms/d/1NpMydhrzrI4K4cvXPHb9UNB-Cp8IgtLy-DJsLegaxBw/edit)
