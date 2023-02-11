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

.. image:: img/classes.png
  :width: 400
  :alt: TonomyID SDK classes



App
----
This class keeps track of applications a TonomyID user is using. 

Blockchain Client
-----------

crypto
-----------

did:jwk
-----------

errors
-----------

KeyManager
-----------

settings
--------
The setting class consumes the settings that are set by the user in a client application. 

Storage
-----------

Tonomy Communication client
-----------

User
----
This is the main entry class. It is used to manage each Tonomy ID user. Using this class, a user can create a unique Tonomy ID by setting a username, password,
and fingerprint. In addition, it can also be used to update a user's information. 

UserApps
--------
UserApp is used to manage the relationship between each TonomonyID user and the apps they use.
