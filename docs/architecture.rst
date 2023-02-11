Archicture
=============

The Tonomy ID SDK is built with `typescript <https://www.typescriptlang.org/>`_.

SDK classes
-----------
The SDK 11 classes.

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

.. image:: https://github.com/deadex-ng/Tonomy-ID-SDK/blob/sdk-docs/docs/img/classes.PNG
  :width: 400
  :alt: TonomyID SDK classes



App
----
This class keeps track of applications a TonomyID user is using. 

Blockchain Client
-----------------
The blockchain client connects the SDK to our blockchain service that is running two smart contracts,  eosio and id.tonomy. explain these two

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
----------
An abstract class that manages the keys on the client's application. It does not store any data itself, they keys are stored oin the client's storage. This class
is used with the User,UserApps and Apps to allow access to keys for digital siganatures.

settings
--------
The settings class consumes the settings that are set by the user in a client application. 

Storage
-------
Storage is an abstract class passed in from the client's application. This allows it to manage the strorage in the client's without stroring any data itself.

Tonomy Communication client
-----------

User
----
This is the main entry class. It is used to manage each Tonomy ID user. Using this class, a user can create a unique Tonomy ID by setting a username, password,
and fingerprint. In addition, it can also be used to update a user's information. 

UserApps
--------
UserApp is used to manage the relationship between each TonomonyID user and the apps they use.
