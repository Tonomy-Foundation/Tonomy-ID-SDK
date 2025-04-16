# Register your Web4 App

Before integrating the Tonomy SDK, your app must be registered. This ensures your app is recognized during user logins and transactions.

### Step 1. Generate App Key

Save the generated private key safely.

```bash
yarn run cli keys create
```

### Step 2. Submit App Details

Contact **Tonomy Foundation** (Discord/Telegram or [Contact Form](https://pangea.web4.world/contact-us)) with the following details for both testnet and mainnet apps:

| Property                  | Example                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------- |
| App Name                  | Fiddl Art                                                                          |
| App Username              | fiddlart                                                                           |
| App Description           | Create and Earn with AI Art                                                        |
| App Origin URL            | [https://fiddl.art](https://fiddl.art)                                             |
| App Logo URL (jpg or png) | [https://fiddl.art/fiddlLogoWithText.png](https://fiddl.art/fiddlLogoWithText.png) |
| Public key (step 1)       | EOS4xnrCGUT688oCuiu7E3Qpn8Phq76TRKNTb87XFMjzsJu                                    |





***

## Launch an App

{% hint style="danger" %}
Only Tonomy Foundation developers can do this currently
{% endhint %}

With the launch of Tonomy Build, developers will be able to create and self-manage their own Web4 Apps in a no-code UI. This is a planned feature we have designed but not started development, without a committed launch date.

### Configure app details

Set the app name, description and other details in the CLI command here:

[https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/blob/development/src/cli/msig/newApp.ts](https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/blob/development/src/cli/msig/newApp.ts)

```bash
yarn run build:cli
```

### Create a new msig proposal to deploy the app

{% hint style="warning" %}
Don't forget to set the NODE\_ENV and SIGNER private key for your governance account
{% endhint %}

```bash
yarn run cli msig propose new-app fiddleart
```

Check that the proposal looks good then write it in the Discord [#governance-council](https://discord.gg/VZavQC7J) channel for approval.
