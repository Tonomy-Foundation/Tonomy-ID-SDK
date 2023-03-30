import { PublicKey } from '@greymass/eosio';
import {
    randomString,
    KeyManager,
    createUserObject,
    App,
    User,
    Message,
    UserApps,
    JWTLoginPayload,
} from '../../src/index';
import { JsKeyManager } from '../../test/services/jskeymanager';
import { jsStorageFactory } from '../../test/services/jsstorage';
import { privateKey } from './eosio';

export async function createUser(username: string, password: string) {
    const auth: KeyManager = new JsKeyManager();
    const user = createUserObject(auth, jsStorageFactory);

    await user.saveUsername(username);
    await user.savePassword(password);

    await user.createPerson();

    return { user, password, auth };
}

export async function createRandomID() {
    const auth: KeyManager = new JsKeyManager();
    const user = createUserObject(auth, jsStorageFactory);

    const username = randomString(8);
    const password = randomString(8) + 'aA0!';
    const pin = Math.floor(Math.random() * 5).toString();

    await user.saveUsername(username);
    await user.savePassword(password);
    await user.savePIN(pin);
    await user.saveFingerprint();
    await user.saveLocal();

    await user.createPerson();
    await user.updateKeys(password);

    return { user, password, pin, auth };
}

export async function createRandomApp(logoUrl?: string, origin?: string): Promise<App> {
    const name = randomString(8);
    const description = randomString(80);

    const port = Math.floor(Math.random() * 65535);

    origin = origin || `http://localhost:${port}`;
    logoUrl = logoUrl || `${origin}/logo.png`;

    return await App.create({
        usernamePrefix: randomString(8),
        appName: name,
        description: description,
        logoUrl,
        origin,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        publicKey: privateKey.toPublic() as any,
    });
}

export async function loginToTonomyCommunication(user: User, log = false) {
    // Login to Tonomy Communication as the user
    const loginMessage = await user.signMessage({});

    if (log) console.log('TONOMY_ID/appStart: connect to Tonomy Communication');

    const loginResponse = await user.communication.login(loginMessage);

    expect(loginResponse).toBe(true);
}

export async function scanQrAndAck(user: User, qrCodeData: string, log = false) {
    if (log) console.log('TONOMY_ID/scanQR: Scanning QR code with Tonomy ID app');

    // BarCodeScannerResult. See Tonomy-ID/node_modules/expo-barcode-scanner/src/BarCodeScanner.tsx
    const barcodeScanResults = {
        data: qrCodeData,
    };
    const connectMessage = await user.signMessage({ type: 'ack' }, barcodeScanResults.data);

    if (log) console.log("TONOMY_ID/scanQr: connecting to Tonomy Login Website's with their did:jwk from the QR code");
    const sendMessageResponse = await user.communication.sendMessage(connectMessage);

    expect(sendMessageResponse).toBe(true);
}

export async function setupLoginRequestSubscriber(
    user: User,
    externalOrigin: string,
    externalDid: string,
    ssoOrigin: string,
    ssoDid: string,
    appsFound: boolean[],
    log = false
) {
    // Setup a promise that resolves when the subscriber executes
    // This emulates the Tonomy ID app, which waits for the user requests
    return new Promise((resolve) => {
        user.communication.subscribeMessage(async (m:any) => {
            if (log) console.log('TONOMY_ID/SSO: receive login requests from Tonomy Login Website');

            const message = new Message(m);

            // receive and verify the requests
            const requests = message.getPayload().requests;

            // TODO check this throws an error if requests are not valid, or not signed correctly
            if (log) console.log('TONOMY_ID/SSO: verifying login request');
            const verifiedRequests = await UserApps.verifyRequests(requests);

            expect(verifiedRequests.length).toBe(2);

            let tonomyIdLoginDid = '';

            for (const jwt of verifiedRequests) {
                // parse the requests for their app data
                const payload = jwt.getPayload() as JWTLoginPayload;
                const loginApp = await App.getApp(payload.origin);
                const senderDid = jwt.getSender();

                if (loginApp.origin === externalOrigin) {
                    appsFound[1] = true;
                    expect(senderDid).toBe(externalDid);

                    if (log) console.log('TONOMY_ID/SSO: logging into external website by adding key to blockchain');
                    await user.apps.loginWithApp(loginApp, PublicKey.from(payload.publicKey));
                } else if (loginApp.origin === ssoOrigin) {
                    appsFound[0] = true;
                    expect(senderDid).toBe(ssoDid);
                    tonomyIdLoginDid = senderDid;
                    if (log)
                        console.log('TONOMY_ID/SSO: logging into Tonomy Login website by adding key to blockchain');
                    await user.apps.loginWithApp(loginApp, PublicKey.from(payload.publicKey));
                } else {
                    throw new Error('Unknown app');
                }
            }

            const accountName = await user.storage.accountName.toString();

            // send a message back to the app
            const respondMessage = (await user.signMessage({ requests, accountName }, tonomyIdLoginDid)) as Message;

            if (log) console.log('TONOMY_ID/SSO: sending a confirmation of the logins back to Tonomy Login Website');
            const sendMessageResponse = await user.communication.sendMessage(respondMessage);

            expect(sendMessageResponse).toBe(true);

            resolve(true);
        });
    });
}
