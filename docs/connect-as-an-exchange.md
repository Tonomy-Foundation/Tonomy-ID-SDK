---
icon: display-chart-up
---

# Connect as an Exchange

Exchanges must connect to the Tonomy network to allow users to withdraw coins. This guide provides the steps to set up an account that can act as a TONO token custodian for exchange coins and allow the exchange to withdraw vested or unvested coins to external Tonomy accounts.

You can connect using the [official Antelope CLI tool called "cleos"](https://github.com/AntelopeIO/leap), or the [Tonomy Javascript SDK](https://github.com/Tonomy-Foundation/Tonomy-ID-SDK) with command line using nodejs or by integrating the Javascript library into your tools.

### Install tools

{% tabs %}
{% tab title="Cleos" %}
Install the official Antelope node CLI "cleos" binary on Ubuntu 22.04. Please use a [different release asset](https://github.com/AntelopeIO/leap/releases/tag/v4.0.6) for other operating systems. Check the [documentation](https://github.com/AntelopeIO/leap) for more details.

```bash
wget https://github.com/AntelopeIO/leap/releases/download/v4.0.6/leap_4.0.6-ubuntu22.04_amd64.deb
sudo apt install ./leap_4.0.6-ubuntu22.04_amd64.deb
rm ./leap_4.0.6-ubuntu22.04_amd64.deb

# create an alias that connects to the correct API
alias cleostonomy="cleos -u https://blockchain-api.tonomy.io"

# check working
cleostonomy get info
```
{% endtab %}

{% tab title="Nodejs" %}
Install the Tonomy Javascript CLI on Ubuntu 22.04 with Nodejs 22.3.0. Check the [documentation](https://github.com/Tonomy-Foundation/Tonomy-ID-SDK) for more details.

```bash
git clone https://github.com/Tonomy-Foundation/Tonomy-ID-SDK
cd Tonomy-ID-SDK

corepack enable
yarn
export NODE_ENV=production
yarn run build:cli

# check working
yarn run cli --help
```
{% endtab %}

{% tab title="Javascript" %}
```typescript
npm i @tonomy/tonomy-id-sdk
# or
yarn add @tonomy/tonomy-id-sdk
```

**Compatibility**

The Tonomy SDK requires `nodejs v20+`

**Notes for yarn v2+**

If using yarn v2+ then you will need to also add the following to your `package.json` file.

```json
"resolutions": {
    "jsonld": "link:./node_modules/@digitalcredentials/jsonld"
  },
```
{% endtab %}
{% endtabs %}

### Step 1: Create keys

Create 2x keys to manage your account on Tonomy Blockchain. One key is treated as high security and used for recovery called the "owner" key, while the other is used for day-to-day operation and can be replaced by the recovery key (if compromised) called the "active" key.

{% tabs %}
{% tab title="Cleos" %}
```bash
cleostonomy create key --to-console
```
{% endtab %}

{% tab title="Nodejs" %}
```bash
yarn run cli keys create
```
{% endtab %}

{% tab title="Javascript" %}
```typescript
import { setSettings, generateRandomKeyPair } from '@tonomy/tonomy-id-sdk';

setSettings({ blockchainUrl: "https://blockchain-api.tonomy.io" });

const keyPair = generateRandomKeyPair();

console.log('Public key: ', keyPair.publicKey.toString());
console.log('Private key: ', keyPair.privateKey.toString());
```
{% endtab %}
{% endtabs %}

<mark style="color:red;">**Store both keys in secure storage.**</mark>

### Step 2: Create an account

Send the following information to the Tonomy Foundation through a secure pre-established channel:

* Choose your account name which is a 12-character \[a-z1-5.] word e.g. `binancelists`
* Choose your username which is an English character lower case word with 2+ characters e.g. `@binanceexchange`
* The name, domain name (website) and logo to use for your exchange
* The **public key** of your "owner" key. <mark style="color:red;">Don't send your private key.</mark>
* The **public key** of your "active" key. <mark style="color:red;">Don't send your private key.</mark>

### Step 3: Get some TONO for allocation to investors

As per your TONO token issuance contract with the Tonomy Foundation, ensure that after your account is created it is allocated the correct amount of TONO. You can look at your account and its tokens on the Tonomy block explorer:

[https://explorer.tonomy.io](https://explorer.tonomy.io)

### Step 4: Collect user's Tonomyaccount

If your users want to create a Tonomy account they can do this by downloading and creating a new account on the Tonomy ID: [https://tonomy.io/tonomy-id](https://tonomy.io/tonomy-id)

They can then send you their account name to which you can withdraw TONO.

If you want to verify if the account exists you can do so:

{% tabs %}
{% tab title="Cleos" %}
```bash
cleostonomy get account pegcnjcnnaqd
```
{% endtab %}

{% tab title="Nodejs" %}
Not available yet. Let us know if you need this.
{% endtab %}

{% tab title="Javascript" %}
```typescript
import { setSettings, getAccount } from '@tonomy/tonomy-id-sdk';

setSettings({ blockchainUrl: "https://blockchain-api.tonomy.io" });

const accountName = "pegcnjcnnaqd";
const account = await getAccount(accountName);
```
{% endtab %}
{% endtabs %}



### Step 5: Withdraw TONO or allocate vested TONO

{% hint style="warning" %}
<mark style="color:orange;">The quantity must be sent with exactly 6 decimal places in the following format "10.000000 TONO"</mark>
{% endhint %}

{% hint style="info" %}
<mark style="color:blue;">You can also batch multiple actions together. This can be done by adding multiple actions in one transaction. Check the</mark> [<mark style="color:blue;">Cleos</mark>](https://docs.eosnetwork.com/manuals/leap/latest/cleos/command-reference/push/push-transaction) <mark style="color:blue;">or</mark> [<mark style="color:blue;">Javascript</mark>](https://wharfkit.com/docs/session-kit/transact#actions) <mark style="color:blue;">documentation for more information.</mark>
{% endhint %}

#### Allocate vested TONO

Vested TONO should be allocated during the private sale (seed) rounds.

{% tabs %}
{% tab title="Cleos" %}
```bash
cleostonomy wallet create --to-console
# import your active key:
cleostonomy wallet import

SENDER=binancelists
RECIPIENT=pegcnjcnnaqd
AMOUNT="10.000000 TONO"
# use category 8 for seed round 1 "early bird, and category 9 for seed round 2 "last chance"
CATEGORY=8

cleostonomy push action vesting.tmy assigntokens "{\"sender\":\"${SENDER}\",\"holder\":\"${RECIPIENT}\",\"amount\":\"${AMOUNT}\",\"category\":${CATEGORY}" -p "${SENDER}@active"
```
{% endtab %}

{% tab title="Nodejs" %}
```bash
export NODE_ENV=production
# use your active private key:
export SIGNING_KEY=PVT_K1_2jFrRPkFNLiZiqLb9QjWxec3Xr7o4Jf4TShxCFq1R1a7e71iSV

SENDER=binancelists
RECIPIENT=pegcnjcnnaqd
AMOUNT="10.000000 TONO"
# use category 8 for seed round 1 "early bird, and category 9 for seed round 2 "last chance"
CATEGORY=8

yarn run cli vesting assign "${SENDER}" "${RECIPIENT}" "${AMOUNT}" "${CATEGORY}"
```
{% endtab %}

{% tab title="Javascript" %}
```typescript
import { setSettings, VestingContract, createSigner } from '@tonomy/tonomy-id-sdk';
import { PrivateKey } from '@wharfkit/antelope';

setSettings({ blockchainUrl: "https://blockchain-api.tonomy.io" });

const vestingContract = VestingContract.Instance;
const privateKey = PrivateKey.from('PVT_K1_2jFrRPkFNLiZiqLb9QjWxec3Xr7o4Jf4TShxCFq1R1a7e71iSV');
const signer = createSigner(privateKey);

const sender = "binancelists"
const recipient = "pegcnjcnnaqd"
const amount = "10.000000 TONO"
// use category 8 for seed round 1 "early bird, and category 9 for seed round 2 "last chance"
const category = 8

await vestingContract.assignTokens(sender, recipient, amount, category, signer);
```
{% endtab %}
{% endtabs %}

#### Withdraw (unvested) TONO

TONO withdrawals can be used during the public sale or after to send users unvested TONO.

{% tabs %}
{% tab title="Cleos" %}
```bash
cleostonomy wallet create --to-console
# import your active key:
cleostonomy wallet import

SENDER=eosusa
RECIPIENT=pegcnjcnnaqd
AMOUNT="10.000000 TONO"
MEMO="my transfer memo"

cleostonomy transfer "${SENDER}" "${RECIPIENT}" "${AMOUNT}" "${MEMO}" -p "${SENDER}@active"
```
{% endtab %}

{% tab title="Nodejs" %}
```bash
export NODE_ENV=production
# use your active private key:
export SIGNING_KEY=PVT_K1_2jFrRPkFNLiZiqLb9QjWxec3Xr7o4Jf4TShxCFq1R1a7e71iSV

SENDER=eosusa
RECIPIENT=pegcnjcnnaqd
AMOUNT="10.000000 TONO"

yarn run cli transfer "${SENDER}" "${RECIPIENT}" "${AMOUNT}"
```
{% endtab %}

{% tab title="Javascript" %}
```typescript
import { setSettings, EosioTokenContract, createSigner } from '@tonomy/tonomy-id-sdk';
import { PrivateKey } from '@wharfkit/antelope';

setSettings({ blockchainUrl: "https://blockchain-api.tonomy.io" });

const tokenContract = EosioTokenContract .Instance;
const privateKey = PrivateKey.from('PVT_K1_2jFrRPkFNLiZiqLb9QjWxec3Xr7o4Jf4TShxCFq1R1a7e71iSV');
const signer = createSigner(privateKey);

const senderi= "eosusa"
const recipient = "pegcnjcnnaqd"
const amount = "10.000000 TONO"

await tokenContract.transfer(sender, recipient, amount, signer);
```
{% endtab %}
{% endtabs %}

### Troubleshooting

Antelope documentation: [https://docs.eosnetwork.com/docs/latest/quick-start/introduction](https://docs.eosnetwork.com/docs/latest/quick-start/introduction)

Antelope telegram group: [https://t.me/antelopedevs](https://t.me/antelopedevs)

Tonomy telegram group: [https://t.me/tonomyIO](https://t.me/tonomyIO)
