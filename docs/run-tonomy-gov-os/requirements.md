# Technical requirements

## Tonomy ID app requirements

Tonomy ID uses React Native and supports iOS 13.4 and Android 5.0 (API 21) or newer. See for more details:

[https://github.com/facebook/react-native#-requirements](https://github.com/facebook/react-native#-requirements)

Additionally, to use the biometric MFA feature on Android, users will need a fingerprint reader on their phone. Apps often give users the option for PIN or Biometrics to work around this.

## Tonomy Gov OS network requirements

The Tonomy ID app works when it is supported by the following infrastructure:

* [Tonomy Communication](https://github.com/Tonomy-Foundation/Tonomy-Communication/tree/master) service v1.0+
* Tonomy Accounts website from the [Tonomy Apps Websites](https://github.com/Tonomy-Foundation/Tonomy-App-Websites/tree/master) repository v1.0+
* An [Antelope blockchain](https://antelope.io/) network v3.0+
* The `id.tmy` contract in the [Tonomy Contracts](https://github.com/Tonomy-Foundation/Tonomy-Contracts/tree/master) repository deployed to the blockchain v1.0+

See [Deploy Tonomy ID](deploy.md) for how to run your own network. Or [contact us](https://tonomy.io/contact-us) to discuss how we can support your network.
