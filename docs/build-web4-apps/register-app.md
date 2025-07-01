# Register your Web4 App

Before integrating the Tonomy SDK, your app must be registered. This ensures your app is recognized during user logins and transactions.

### Step 1. Generate App Key

Save the generated private key safely.

```bash
yarn run cli keys create
```

### Step 2. Submit App Details

To register your app on both **testnet** and **mainnet**, please fill out the following form with the required details:&#x20;

📋 **Submit here:** [Tonomy App Registration Form](https://docs.google.com/forms/d/1NpMydhrzrI4K4cvXPHb9UNB-Cp8IgtLy-DJsLegaxBw/edit)

| Property               | Example                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Name                   | Fiddl Art                                                                          |
| Username               | fiddlart                                                                           |
| Description            | Create and Earn with AI Art                                                        |
| Origin URL             | [https://fiddl.art](https://fiddl.art)                                             |
| Logo URL (jpg or png)  | [https://fiddl.art/fiddlLogoWithText.png](https://fiddl.art/fiddlLogoWithText.png) |
| Public key (step 1)    | EOS4xnrCGUT688oCuiu7E3Qpn8Phq76TRKNTb87XFMjzsJu                                    |
| Background Color (hex) | #251950                                                                            |
| Accent Color (hex)     | #BA54D3                                                                            |



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
