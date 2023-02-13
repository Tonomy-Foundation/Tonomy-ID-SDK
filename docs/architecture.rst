Archicture
=============

The Tonomy ID SDK is built with `typescript <https://www.typescriptlang.org/>`_.

SDK classes
-----------
The SDK has 11 classes.

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

App
----
This class keeps track of applications a TonomyID user is using. 

Blockchain Client
-----------------
The blockchain client connects the SDK to our blockchain service that is running two smart contracts, eosio and id.tonomy. eosio is a system level governance 
contract that sets who is allowed to run the blockchain and create accounts. 

Additionally, id.tonomy is a smart contract that manages permissions for users to create and login into accounts. It also provides additional cryptographic information for the SDK logic to work. 

crypto
------
A utility that contains cryptographic functions. 

did:jwk
-------
This is a utility that manages ssi djwk

errors
------
A utility used for error handling.

KeyManager
----------------
An abstract class that manages the keys on the client's application. It does not store any data itself, the keys are stored in the client's storage. This class is used with the User, UserApps and Apps to allow access to keys for digital signatures.

settings
----------
The settings class consumes the settings that are set by the user in a client application. 

Storage
----------
Storage is an abstract class passed in from the client's application. This allows it to manage the storage in the client's without storing any data itself.

Tonomy Communication client
----------------------------------------
This client connects to the Tonomy Communication server which acts as a broker for web sockets between two Tonomy ID peers.

User
------
This is the main entry class. It is used to manage each Tonomy ID user. Using this class, a user can create a unique Tonomy ID by setting a username, password, and fingerprint. In addition, it can also be used to update a user's information. 

UserApps
-------------
UserApp is used to manage the relationship between each TonomonyID user and the apps they use.
