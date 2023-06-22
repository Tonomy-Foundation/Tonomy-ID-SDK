import {
    randomString,
    KeyManager,
    createUserObject,
    App,
    User,
    UserApps,
    JsKeyManager,
    IdentifyMessage,
    AuthenticationMessage,
    LoginRequestsMessage,
} from '../../src/sdk/index';
import { jsStorageFactory } from '../../src/cli/bootstrap/jsstorage';
import { generatePrivateKeyFromPassword } from '../../src/cli/bootstrap/keys';
import { privateKey } from './eosio';
import { createUser } from '../../src/cli/bootstrap/user';
import { LoginRequest } from '../../src/sdk/util/request';
import { DIDurl, URL } from '../../src/sdk/util/ssi/types';

export { createUser };

export async function createRandomID(checkKeys = true) {
    const auth: KeyManager = new JsKeyManager();
    const user = createUserObject(auth, jsStorageFactory);

    const username = randomString(8);
    const password = randomString(8) + 'aA0!';
    const pin = Math.floor(Math.random() * 5).toString();

    await user.saveUsername(username);
    await user.savePassword(password, { keyFromPasswordFn: generatePrivateKeyFromPassword });
    checkKeys && (await user.savePIN(pin));
    checkKeys && (await user.saveFingerprint());
    await user.saveLocal();

    await user.createPerson();
    await user.updateKeys(password);

    return { user, password, pin, auth, username };
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
    const issuer = await user.getIssuer();
    // Login to Tonomy Communication as the user
    const authMessage = await AuthenticationMessage.signMessageWithoutRecipient({}, issuer);

    if (log) console.log('TONOMY_ID/appStart: connect to Tonomy Communication');

    const loginResponse = await user.communication.login(authMessage);

    expect(loginResponse).toBe(true);
}

export async function scanQrAndAck(user: User, qrCodeData: string, log = false) {
    if (log) console.log('TONOMY_ID/scanQR: Scanning QR code with Tonomy ID app');

    // BarCodeScannerResult. See Tonomy-ID/node_modules/expo-barcode-scanner/src/BarCodeScanner.tsx
    const barcodeScanResults = {
        data: qrCodeData,
    };

    const connectMessage = await IdentifyMessage.signMessage({}, await user.getIssuer(), barcodeScanResults.data);

    if (log) console.log("TONOMY_ID/scanQr: connecting to Tonomy Login Website's with their did:jwk from the QR code");
    const sendMessageResponse = await user.communication.sendMessage(connectMessage);

    expect(sendMessageResponse).toBe(true);
}

export async function setupLoginRequestSubscriber(
    user: User,
    tonomyLoginOrigin: URL,
    tonomyLoginDid: DIDurl,
    log = false
) {
    // Setup a promise that resolves when the subscriber executes
    // This emulates the Tonomy ID app, which waits for the user requests
    return new Promise((resolve) => {
        user.communication.subscribeMessage(async (message) => {
            const loginRequestMessage = new LoginRequestsMessage(message);

            if (log) console.log('TONOMY_ID/SSO: receive login requests from Tonomy Login Website');

            // receive and verify the requests
            const requests = loginRequestMessage.getPayload().requests;

            // TODO check this throws an error if requests are not valid, or not signed correctly
            if (log) console.log('TONOMY_ID/SSO: verifying login request');
            const verifiedRequests = await UserApps.verifyRequests(requests);

            expect(verifiedRequests.length).toBe(2);

            const acceptArray: { app: App; request: LoginRequest }[] = [];

            let receiverDid = '';

            for (const request of verifiedRequests) {
                const payload = request.getPayload();

                if (payload.origin === tonomyLoginOrigin) receiverDid = request.getIssuer();
                const loginApp = await App.getApp(payload.origin);

                acceptArray.push({ app: loginApp, request, requiresLogin: true });
            }

            expect(receiverDid).toBe(tonomyLoginDid);
            expect(receiverDid).toBe(loginRequestMessage.getSender());

            if (log)
                console.log('TONOMY_ID/SSO: accepting login requests and sending confirmation to Tonomy Login Website');
            await user.apps.acceptLoginRequest(acceptArray, 'browser', receiverDid);

            resolve(true);
        }, LoginRequestsMessage.getType());
    });
}
