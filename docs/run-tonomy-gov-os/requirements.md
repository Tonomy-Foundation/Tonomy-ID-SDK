# Technical requirements

## Pangea Passport app requirements

Pangea Passport uses React Native and supports iOS 13.4 and Android 5.0 (API 21) or newer. See for more details:

[https://github.com/facebook/react-native#-requirements](https://github.com/facebook/react-native#-requirements)

Additionally, to use the biometric MFA feature on Android, users will need a fingerprint reader on their phone. Apps often give users the option for PIN or Biometrics to work around this.

## Tonomy Gov OS network requirements

The Pangea Passport app works when it is supported by the following infrastructure:

* [Pangea Communication](https://github.com/Tonomy-Foundation/Tonomy-Communication/tree/master) service v1.0+
* Pangea Accounts website from the [Pangea Apps Websites](https://github.com/Tonomy-Foundation/Tonomy-App-Websites/tree/master) repository v1.0+
* An [Antelope blockchain](https://antelope.io/) network v3.0+
* The `id.tmy` contract in the [Pangea Contracts](https://github.com/Tonomy-Foundation/Tonomy-Contracts/tree/master) repository deployed to the blockchain v1.0+

See [Deploy Pangea Passport](deploy.md) for how to run your own network. Or [contact us](https://pangea.web4.world/contact-us) to discuss how we can support your network.
