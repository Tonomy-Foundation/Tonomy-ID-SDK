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
    ExternalUser,
    DemoTokenContract,
    getSettings,
    setSettings,
    Communication,
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
    externalWebsiteOnReload,
    externalWebsiteOnLogout,
    externalWebsiteSignVc,
    externalWebsiteSignTransaction,
    externalWebsiteClientAuth,
    loginToExternalApp,
    getProtectedCommunication,
} from './helpers/externalUser';
import { createStorageFactory } from './helpers/storageFactory';
import { createSigner, getTonomyOperationsKey } from '../src/sdk/services/blockchain';
import { setTestSettings, settings } from './helpers/settings';
import deployContract from '../src/cli/bootstrap/deploy-contract';
import Debug from 'debug';

const debug = Debug('tonomy-sdk-tests:externalUser.integration.test');

export type ExternalUserLoginTestOptions = {
    dataRequest?: boolean;
    dataRequestUsername?: boolean;
    dataRequestKYC?: boolean;
    dataRequestKYCDecision?: 'approved' | 'declined';
    swapToken?: boolean;
};

setTestSettings();

const signer = createSigner(getTonomyOperationsKey());

describe('ExternalUser: Login to external website', () => {
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
    let EXTERNAL_WEBSITE_user: ExternalUser;
    const communicationsToCleanup: Communication[] = [];

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

        debug('Deploying and configuring demo.tmy contract to ', externalApp.accountName.toString());
        await deployContract(
            { account: externalApp.accountName, contractDir: './Tonomy-Contracts/contracts/demo.tmy' },
            signer,
            {
                throughTonomyProxy: true
            }
        );
        const demoTokenContract = await DemoTokenContract.atAccount(externalApp.accountName);

        await demoTokenContract.create(
            demoTokenContract.contractName,
            `1000000000.000000 ${getSettings().currencySymbol}`,
            signer
        );
        await demoTokenContract.issue(demoTokenContract.contractName,
            `10000.000000 ${getSettings().currencySymbol}`, '',
            signer
        );

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
    });

    afterEach(async () => {
        if (TONOMY_ID_user) {
            await TONOMY_ID_user.logout();
        }

        if (TONOMY_ID_dataSource) {
            await TONOMY_ID_dataSource.destroy();
            TONOMY_ID_dataSource = await setupTestDatabase();
        }

        await disconnectCommunications(communicationsToCleanup);

        debug('finished cleanup');

        // for some reason this is needed to ensure all the code lines execute. Not sure why needed
        // TODO: figure out why this is needed and remove issue
        await sleep(1000);
    });

    afterAll(async () => {
        if (TONOMY_ID_dataSource) {
            await TONOMY_ID_dataSource.destroy();
        }
    });

    describe('SSO login full end-to-end flow with external desktop browser (using communication service)', () => {
        test('Successful login to external website - no data request', async () => {
            expect.assertions(56);
            await runExternalUserLoginTest({});
        });

        test('Successful login to external website with empty data request', async () => {
            expect.assertions(57);
            await runExternalUserLoginTest({ dataRequest: true });
        });

        test('Successful login to external website with data request for username', async () => {
            expect.assertions(60);
            await runExternalUserLoginTest({ dataRequest: true, dataRequestUsername: true });
        });

        test('Successful login to external website with data request for KYC verification successful', async () => {
            expect.assertions(88);
            await runExternalUserLoginTest({ dataRequest: true, dataRequestKYC: true, dataRequestKYCDecision: 'approved' });
        });

        test('Unsuccessful login to external website with data request for KYC verification failed', async () => {
            expect.assertions(37);
            await runExternalUserLoginTest({ dataRequest: true, dataRequestKYC: true, dataRequestKYCDecision: 'declined' });
        });
    });

    async function runExternalUserLoginTest(testOptions: ExternalUserLoginTestOptions) {
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
            testOptions
        );

        if (!res) {
            debug('External website user not created');
            return;
        }

        EXTERNAL_WEBSITE_user = res;

        await disconnectCommunications([getProtectedCommunication(EXTERNAL_WEBSITE_user)]);

        EXTERNAL_WEBSITE_user = await externalWebsiteOnReload(
            EXTERNAL_WEBSITE_jsKeyManager,
            EXTERNAL_WEBSITE_storage_factory,
            TONOMY_ID_user
        );
        communicationsToCleanup.push(getProtectedCommunication(EXTERNAL_WEBSITE_user));

        await externalWebsiteSignVc(EXTERNAL_WEBSITE_user);
        await externalWebsiteSignTransaction(EXTERNAL_WEBSITE_user, externalApp);
        await externalWebsiteClientAuth(EXTERNAL_WEBSITE_user, externalApp, testOptions);
        await externalWebsiteOnLogout(EXTERNAL_WEBSITE_jsKeyManager, EXTERNAL_WEBSITE_storage_factory);
    }

    async function disconnectCommunications(communications: Communication[]) {
        for (const communication of communications) {
            await communication.disconnect();
        }

        debug('finished disconnecting all communications');
    }
});