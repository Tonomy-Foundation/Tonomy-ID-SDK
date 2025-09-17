/**
 * @jest-environment jsdom
 */

/* eslint-disable prettier/prettier */
/* eslint-disable camelcase */

import {
    App,
    KeyManager,
    StorageFactory,
    STORAGE_NAMESPACE,
    setSettings,
    Communication,
    getBaseTokenContract,
    createSignedProofMessage,
    getSigner,
} from '../src/sdk/index';
import { JsKeyManager } from '../src/sdk/storage/jsKeyManager';
import { DataSource } from 'typeorm';
import { jest } from '@jest/globals';
import { setupTestDatabase } from './storage/testDatabase';
import {
    IUserPublic,
    createRandomApp,
    createRandomID,
    loginToTonomyCommunication,
} from './helpers/user';
import { sleep } from '../src/sdk/util/time';
import {
    loginToExternalApp,
} from './helpers/externalUser';
import { createStorageFactory } from './helpers/storageFactory';
import { getTokenContract } from '../src/sdk/services/blockchain';
import { setTestSettings, settings } from './helpers/settings';
import Debug from 'debug';
import Decimal from 'decimal.js';
import { AppsExternalUser } from '../src/api/appsExternalUser';

const debug = Debug('tonomy-sdk-tests:externalUser.integration.test');

setTestSettings();

describe('Login to external website', () => {
    jest.setTimeout(50000);

    /** Object naming convention - indicates the different devices/apps the user is using
     * it shows which device is doing what action and has access to which variables:
     * - TONOMY_ID_
     * - EXTERNAL_WEBSITE_
     * - TONOMY_LOGIN_WEBSITE_
     */

    let TONOMY_ID_dataSource: DataSource;
    let TONOMY_ID_user: IUserPublic;
    let externalApp: App;
    let tonomyLoginApp: App;
    let TONOMY_LOGIN_WEBSITE_jsKeyManager: KeyManager;
    let TONOMY_LOGIN_WEBSITE_storage_factory: StorageFactory;
    let EXTERNAL_WEBSITE_jsKeyManager: KeyManager;
    let EXTERNAL_WEBSITE_storage_factory: StorageFactory;
    let APPS_EXTERNAL_WEBSITE_user: AppsExternalUser;
    const communicationsToCleanup: Communication[] = [];
    let userBaseAddress: string;

    beforeEach(async () => {
        // Initialize typeorm data source
        TONOMY_ID_dataSource = await setupTestDatabase();

        // ##### Tonomy ID user #####
        // ##########################
        // Create new Tonomy ID user
        debug('TONOMY_ID: creating new Tonomy ID user');
        TONOMY_ID_user = (await createRandomID()).user;
        communicationsToCleanup.push(TONOMY_ID_user.communication);

        expect(await TONOMY_ID_user.getDid()).toContain('did:antelope:');

        await loginToTonomyCommunication(TONOMY_ID_user);

        // Create app which will be logged into
        externalApp = await createRandomApp();
        tonomyLoginApp = await createRandomApp();
       
        setSettings({
            ...settings,
            ssoWebsiteOrigin: tonomyLoginApp.origin,
        });

        // setup KeyManagers for the external website and tonomy login website
        TONOMY_LOGIN_WEBSITE_jsKeyManager = new JsKeyManager();
        EXTERNAL_WEBSITE_jsKeyManager = new JsKeyManager();

        // setup storage factories for the external website and tonomy login website
        TONOMY_LOGIN_WEBSITE_storage_factory = createStorageFactory(STORAGE_NAMESPACE + 'login-website.');
        EXTERNAL_WEBSITE_storage_factory = createStorageFactory(STORAGE_NAMESPACE + 'external-website.');

        const userBaseSigner = getSigner();

        if (!userBaseSigner) throw new Error('No signer available');
        userBaseAddress = await userBaseSigner.getAddress();
    });

    afterEach(async () => {
        if (TONOMY_ID_user) {
            await TONOMY_ID_user.logout();
        }

        if (TONOMY_ID_dataSource) {
            await TONOMY_ID_dataSource.destroy();
            TONOMY_ID_dataSource = await setupTestDatabase();
        }

        disconnectCommunications(communicationsToCleanup);

        debug('finished cleanup');

        // for some reason this is needed to ensure all the code lines execute. Not sure why needed
        // TODO: figure out why this is needed and remove issue
        await sleep(1000);
        console.log('Finished afterEach()!')
    });

    afterAll(async () => {
        if (TONOMY_ID_dataSource) {
            await TONOMY_ID_dataSource.destroy();
        }
    });

    describe('SwapToken services are working', () => {
        test('should swap a token to the Base network and back again', async () => {
            expect.assertions(27);
            await runAppsExternalUserLoginTest();  
            console.log("Test complete");         
        });
    });

    async function runAppsExternalUserLoginTest() {
        const res = await loginToExternalApp(
            {
                externalApp,
                tonomyLoginApp,
                EXTERNAL_WEBSITE_jsKeyManager,
                TONOMY_LOGIN_WEBSITE_jsKeyManager,
                TONOMY_ID_user,
                TONOMY_LOGIN_WEBSITE_storage_factory,
                EXTERNAL_WEBSITE_storage_factory,
                communicationsToCleanup
            },
            {}
        );

        if (!res) {
            debug('External website user not created');
            return;
        }

        APPS_EXTERNAL_WEBSITE_user = new AppsExternalUser(res);
        
        const amount = new Decimal("0.5");
        const tonomyAccountName = await APPS_EXTERNAL_WEBSITE_user.getAccountName()
            
        const balanceBeforeBase = await getBaseTokenContract().balanceOf(userBaseAddress);            
        const balanceBeforeTonomy = await getTokenContract().getBalanceDecimal(tonomyAccountName);

        console.log("Before Swap");
        console.log("Base balance:", balanceBeforeBase.toString());
        console.log("Tonomy balance:", balanceBeforeTonomy.toString());

        const proof = await createSignedProofMessage()
        const tonomyAppsWebsiteUsername = await externalApp.username?.getBaseUsername();

        await APPS_EXTERNAL_WEBSITE_user.swapToken(amount, proof, 'base', tonomyAppsWebsiteUsername);

        const balanceAfterBase = await getBaseTokenContract().balanceOf(userBaseAddress);
        const balanceAfterTonomy = await getTokenContract().getBalanceDecimal(tonomyAccountName);

        console.log("After Swap:");
        console.log("Base balance:", balanceAfterBase.toString());
        console.log("Tonomy balance:", balanceAfterTonomy.toString());

    }

    async function disconnectCommunications(communications: Communication[]) {
        for (const communication of communications) {
            await communication.disconnect();
        }

        debug('finished disconnecting all communications');
    }
});