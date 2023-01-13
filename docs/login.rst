
===============
Login to your app with Tonomy ID
===============

You can log into your application with Tonomy ID using the Single-sign (SSO) on flow.

See a full example Reactjs website with Tonomy ID login here:

https://github.com/Tonomy-Foundation/Tonomy-ID-Demo-market.com/tree/development

Login page
==============


`Login.tsx` shows an example Reactjs implementation for a login

.. code-block:: html

    TODO import the css file
    <button className="tonomy" onClick={onButtonPress}>
        Login with Tonomy ID
    </button>

.. code-block:: typescript

    import { UserApps, setSettings } from '@tonomy/tonomy-id-sdk';

    ...

    async function onButtonPress() {
        setSettings({ ssoWebsiteOrigin: "https://tonomy-id-staging.tonomy.foundation" });

        UserApps.onPressLogin({ callbackPath: '/callback' });
    }

Callback page
==============

.. code-block:: typescript

    import { SdkError, UserApps } from '@tonomy/tonomy-id-sdk';

    ...

    useEffect(() => {
        verifyLogin();
    }, []);

    async function verifyLogin() {
        try {
            const user = await UserApps.verifyUserLogin();
        } catch (e) {
            if (e instanceof SdkErrors) {
                // Handle error
            }
        }

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
