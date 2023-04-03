Using the SDK
=============

To login to an application with the TonomyID using `Single Sign-On <https://en.wikipedia.org/wiki/Single_sign-on>`_.

See a full example Reactjs website with Tonomy ID login here:

https://github.com/Tonomy-Foundation/Tonomy-ID-Demo-market.com/tree/development


Register your app
--------------

First, you need to register your app with Tonomy ID. You can do this by running the following command:

.. code-block:: bash

    npm run cli apps create appName username description logoUrl domain publicKey blockchainUrl

    # Example

    npm run cli apps create Netflix netflix "streaming video platform" "https://netflix.com/logo.png" "https://netflix.com" PUB_K1_55csjge6LNnLxECFTtTpCU6Z7chi3h47G8vyzPBjAKdvZmnZ8Z "http://localhost:8888"


Install
--------------

.. code-block:: bash

    npm i @tonomy/tonomy-id-sdk


Login page
--------------

To use the SDK, first import it:

.. code-block:: typescript

    import { UserApps, setSettings } from '@tonomy/tonomy-id-sdk';

    ...

    async function onButtonPress() {
        setSettings({ ssoWebsiteOrigin: "https://tonomy-id-staging.tonomy.foundation" });

        ExternalUser.loginWithTonomy({ callbackPath: '/callback' });
    }
    
We can call the function ``onButtonPress()`` in the login implementation:

.. code-block:: html

    <button className="btn" onClick={onButtonPress}>
        Login with Tonomy ID
    </button>


Callback page
--------------

.. code-block:: typescript

    import { SdkError, ExternalUser } from '@tonomy/tonomy-id-sdk';

    ...

    useEffect(() => {
        verifyLogin();
    }, []);

    async function verifyLogin() {
        try {
            const user = await ExternalUser.verifyLoginRequest({
                keyManager: new JsKeyManager(),
            });
        } catch (e) {
            if (e instanceof SdkErrors) {
                // Handle error
            }
        }

        // Get the account name
        const accountName = await user.getAccountName();

        // For example, you can now sign a transaction on the Antelope blockchain
        .. TODO
        const tx = await user.signTransaction({
            transaction: {
                to: 
            },
        });

        // For example, you can use the user's DID to sign a VC
        .. TODO
        const vc = await user.signCredential({
            credential: {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiableCredential'],
                issuer: user.did,
                issuanceDate: new Date().toISOString(),
                credentialSubject: {
                    id: user.did,
                    name: 'John Doe',
                },
            },
        });
    }
