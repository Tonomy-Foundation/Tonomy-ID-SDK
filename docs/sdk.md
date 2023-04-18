# Software Development Kit (SDK)

The Tonomy ID SDK is built with [typescript](https://www.typescriptlang.org).

## SDK architecture

The SDK has 11 major components.

1. App
2. Blockchain Client
3. crypto
4. did:jwk
5. errors
6. KeyManager
7. settings
8. Storage
9. Tonomy Communication client
10. User
11. UserApps

### App

This class is used by external applications to register their applications in the Tonomy ecosystem to make use of the Tonomy ID for login.

### Blockchain Client

The blockchain client connects the SDK to our blockchain service that is running two smart contracts, Antelope and id.tonomy. Antelope is a system level governance
contract that sets who is allowed to run the blockchain and create accounts.

Additionally, id.tonomy is a smart contract that manages permissions for users to create and login into accounts. It also provides additional cryptographic information for the SDK logic to work.

We call the getApi() function in this [file](https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/blob/development/src/services/eosio/eosio.ts) to access the Blockchain client.

### crypto

A compatible utility for js and node that contains cryptographic functions.

### did:jwk

This is a utility that manages did:jwk

### errors

A utility used for error handling.

### KeyManager

An abstract class that manages the keys on the client's application. It does not store any data itself, the keys are stored in the client's storage. This class is used with the User, UserApps and Apps to allow access to keys for digital signatures.

### settings

The settings class consumes the settings that are set by the user in a client application.

### Storage

Storage is an abstract class passed in from the client's application. This allows it to manage the storage in the client's without storing any data itself.

### Tonomy Communication client

This client connects to the Tonomy Communication server which acts as a bridge for web sockets between two Tonomy ID peers. Additionally, it can connect the same user to his/her multiple clients.

### User

This is the main entry class. It is used to manage each Tonomy ID user. Using this class, a user can create a unique Tonomy ID by setting a username, password, and biometric. In addition, it can also be used to update a user's information.

### UserApps

UserApp is used to manage the relationship between each Tonomy ID user and the apps they use.

### ExternalUser

This is the main API for external applications to use the SSO and integration features.
