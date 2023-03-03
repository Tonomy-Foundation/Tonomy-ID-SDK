Using the SDK
=============

Login
--------------

To login to an application with the TonomyID using `Single Sign-On <https://en.wikipedia.org/wiki/Single_sign-on>`_.

To use the SDK, first import it:

.. code-block:: typescript

    import { UserApps, setSettings } from '@tonomy/tonomy-id-sdk';

    ...

    async function onButtonPress() {
        setSettings({ ssoWebsiteOrigin: "https://tonomy-id-staging.tonomy.foundation" });

        UserApps.onPressLogin({ callbackPath: '/callback' });
    }
    
We can call the function ``onButtonPress()`` in the login implementation:

.. code-block:: html

    <button className="btn" onClick={onButtonPress}>
        Login with Tonomy ID
    </button>
   
