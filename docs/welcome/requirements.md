# Technical requirements

## Tonomy ID app requirements

Tonomy ID uses React Native and supports iOS 13.4 and Android 5.0 (API 21) or newer. See for more details:

<https://github.com/facebook/react-native#-requirements>

Additionally, to use the biometric MFA feature on Android, users will need a fingerprint reader on their phone. Apps often give users the option for PIN or Biometrics to work around this.

## Tonomy ID network requirements

The Tonomy ID app works when it is supported by the following infrastructure:

- <a href="https://github.com/Tonomy-Foundation/Tonomy-Communication" target="_blank">Tonomy Communication</a> service v1.0+
- Tonomy Accounts website from the <a href="https://github.com/Tonomy-Foundation/Tonomy-App-Websites" target="_blank">Tonomy Apps Websites</a> repository v1.0+
- An <a href="https://antelope.io/" target="_blank">Antelope blockchain</a> network v3.0+
- The `id.tonomy` contract in the <a href="https://github.com/Tonomy-Foundation/Tonomy-Contracts" target="_blank">Tonomy Contracts</a> repository deployed v1.0+

[Deploy Tonomy ID](../../guides/deploy) for how to run your own network. Or <a href="https://tonomy.io/contact" target="_blank">contact us</a> to discuss how we can support your network.
