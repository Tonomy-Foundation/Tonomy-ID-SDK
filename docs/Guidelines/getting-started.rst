
===============
Getting Started
===============

This Software Development Kit is used in Tonomy ID to interact and call with the 
EOSIO blockchain and services. It is also used as the public API for integration 
by applications to do single sign-on, share credentials and sign transactions.


.. _Dependancies:

Dependancies
==============

- Linux debian distribution (Ubuntu 20.0.4 LTS used)
- Nodejs (https://nodejs.org) v16.4.1+ suggested installed with [nvm](https://github.com/nvm-sh/nvm)



.. _adding-web3:

Runnig Tonomy-ID-SDK
==============

.. index:: npm 


- npm: ``npm start``


This builds to ``/dist`` and runs the project in watch mode 
so any edits you save inside ``src`` causes a rebuild to ``/dist``.


To do a one-off build, use ``npm run build``.

.. _Tests:

Testing Tonomy-ID-SDK
==============

To run tests, use ``npm test``.


.. _Linting:

Testing Tonomy-ID-SDK
==============

Linting is done with ``eslint``. Install the recommended VS Code plugin to see markers in your code.

``npm run lint``



.. code-block:: javascript

    // In Typescript use: const _storage = require('storage');

    const _storage = new Proxy(storage, storageProxyHandler as any);

That's it! now you can use the ``Tonomy-ID-SDK`` object.
