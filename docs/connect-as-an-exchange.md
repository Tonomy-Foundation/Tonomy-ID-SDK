# Connect as an Exchange

Exchanges must connect to the Pangea network to transfer and sell LEOS and other tokens. This guide provides the steps to set up an account that can act as a LEOS token custodian for token sales and exchange listing management.

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
alias cleospangea="cleos -u https://blockchain-api.pangea.web4.world/"

# check working
cleospangea get info
```
{% endtab %}

{% tab title="Nodejs" %}
Install the Pangea Javascript CLI on Ubuntu 22.04 with Nodejs 22.3.0. Check the [documentation](https://github.com/Tonomy-Foundation/Tonomy-ID-SDK) for more details.

<pre class="language-bash"><code class="lang-bash"><strong>git clone https://github.com/Tonomy-Foundation/Tonomy-ID-SDK
</strong><strong>cd Tonomy-ID-SDK
</strong><strong>
</strong><strong>corepack enable
</strong>yarn
export NODE_ENV=production
yarn run build:cli

# check working
yarn run cli --help
</code></pre>

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

Create 2x keys to manage your account on Pangea Blockchain. One key is treated as high security and used for recovery called the "owner" key, while the other is used for day-to-day operation and can be replaced by the recovery key (if compromised) called the "active" key.

{% tabs %}
{% tab title="Cleos" %}
```bash
cleospangea create key --to-console
```
{% endtab %}

{% tab title="Nodejs" %}
```bash
yarn run cli keys create
```
{% endtab %}

{% tab title="Javascript" %}
<pre class="language-typescript"><code class="lang-typescript"><strong>import { setSettings, generateRandomKeyPair } from '@tonomy/tonomy-id-sdk';
</strong>
setSettings({ blockchainUrl: "https://blockchain-api.pangea.web4.world" });

const keyPair = generateRandomKeyPair();

console.log('Public key: ', keyPair.publicKey.toString());
console.log('Private key: ', keyPair.privateKey.toString());
</code></pre>
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

### Step 3: Get some LEOS for allocation to investors

As per your LEOS token issuance contract with the Tonomy Foundation, ensure that after your account is created it is allocated the correct amount of LEOS. You can look at your account and its tokens on the Pangea block explorer:

[https://explorer.pangea.web4.world](https://explorer.pangea.web4.world/network)

### Step 4: Get the user to create a Pangea account and collect their username and account name - to be allocated LEOS to

Tell your users to create a Pangea account by downloading and creating a new account on the United Citizens Wallet: [https://pangea.web4.world/united-citizens-wallet](https://pangea.web4.world/united-citizens-wallet)

Set up the single-sign-on login to your exchange using the [Pangea Single Sign-On documentation](build-web4-apps/start/single-sign-on.md).

After the user has logged in, you can get their account name from the user object that is provided and verified in the `/callback` page, as shown on the [Pangea Usage and signing data documentation](build-web4-apps/start/usage.md).

```typescript
const accountName = await user.getAccountName().toString();
```

### Step 5: Allocate vested LEOS or transfer LEOS

{% hint style="success" %}
<mark style="color:green;">**Info: The quantity must be sent with 6 decimal places in the following format "10.000000 LEOS"**</mark>
{% endhint %}

#### Allocate vested LEOS

Vested LEOS should be allocated during the private sale (seed) rounds.

{% tabs %}
{% tab title="Cleos" %}
<pre class="language-bash"><code class="lang-bash">cleospangea wallet create --to-console
# import your active key:
cleospangea wallet import

SENDER=binancelists
RECIPIENT=pegcnjcnnaqd
AMOUNT="10.000000 LEOS"
# use category 8 for seed round 1 "early bird, and category 9 for seed round 2 "last chance"
CATEGORY=8

<strong>cleospangea push action vesting.tmy assigntokens "{\"sender\":\"${SENDER}\",\"holder\":\"${RECIPIENT}\",\"amount\":\"${AMOUNT}\",\"category\":${CATEGORY}" -p "${SENDER}@active"
</strong></code></pre>
{% endtab %}

{% tab title="Nodejs" %}
```bash
export NODE_ENV=production
# use your active private key:
export SIGNING_KEY=PVT_K1_2jFrRPkFNLiZiqLb9QjWxec3Xr7o4Jf4TShxCFq1R1a7e71iSV

SENDER=binancelists
RECIPIENT=pegcnjcnnaqd
AMOUNT="10.000000 LEOS"
# use category 8 for seed round 1 "early bird, and category 9 for seed round 2 "last chance"
CATEGORY=8

yarn run cli vesting assign "${SENDER}" "${RECIPIENT}" "${AMOUNT}" "${CATEGORY}"
```
{% endtab %}

{% tab title="Javascript" %}
```typescript
import { setSettings, VestingContract } from '@tonomy/tonomy-id-sdk';
import { PrivateKey } from '@wharfkit/antelope';

setSettings({ blockchainUrl: "https://blockchain-api.pangea.web4.world" });

const vestingContract = VestingContract.Instance;
const privateKey = PrivateKey.from('PVT_K1_2jFrRPkFNLiZiqLb9QjWxec3Xr7o4Jf4TShxCFq1R1a7e71iSV');
const signer = createSigner(privateKey);

const sender = "binancelists"
const recipient = "pegcnjcnnaqd"
const amount = "10.000000 LEOS"
// use category 8 for seed round 1 "early bird, and category 9 for seed round 2 "last chance"
const category = 8

await vestingContract.assignTokens(sender, recipient, amount, category, signer);
```
{% endtab %}
{% endtabs %}

#### Transfer (unvested) LEOS

LEOS transfers can be used during the public sale or after to send users unvested LEOS.

{% tabs %}
{% tab title="Cleos" %}
```bash
cleospangea wallet create --to-console
# import your active key:
cleospangea wallet import

SENDER=eosusa
RECIPIENT=pegcnjcnnaqd
AMOUNT="10.000000 LEOS"
MEMO="my transfer memo"
cleospangea transfer "${SENDER}" "${RECIPIENT}" "${AMOUNT}" "${MEMO}" -p "${SENDER}@active"
```
{% endtab %}

{% tab title="Nodejs" %}
```bash
export NODE_ENV=production
# use your active private key:
export SIGNING_KEY=PVT_K1_2jFrRPkFNLiZiqLb9QjWxec3Xr7o4Jf4TShxCFq1R1a7e71iSV

SENDER=eosusa
RECIPIENT=pegcnjcnnaqd
AMOUNT="10.000000 LEOS"

yarn run cli transfer "${SENDER}" "${RECIPIENT}" "${AMOUNT}"
```
{% endtab %}

{% tab title="Javascript" %}
```typescript
import { setSettings, EosioTokenContract } from '@tonomy/tonomy-id-sdk';
import { PrivateKey } from '@wharfkit/antelope';

setSettings({ blockchainUrl: "https://blockchain-api.pangea.web4.world" });

const tokenContract = EosioTokenContract .Instance;
const privateKey = PrivateKey.from('PVT_K1_2jFrRPkFNLiZiqLb9QjWxec3Xr7o4Jf4TShxCFq1R1a7e71iSV');
const signer = createSigner(privateKey);

const senderi= "eosusa"
const recipient = "pegcnjcnnaqd"
const amount = "10.000000 LEOS"

await tokenContract.transfer(sender, recipient, amount, signer);
```
{% endtab %}
{% endtabs %}

### Troubleshooting

Antelope documentation: [https://docs.eosnetwork.com/docs/latest/quick-start/introduction](https://docs.eosnetwork.com/docs/latest/quick-start/introduction)

Antelope telegram group: [https://t.me/antelopedevs](https://t.me/antelopedevs)

Pangea telegram group: [https://t.me/pangea\_web4](https://t.me/pangea\_web4)
