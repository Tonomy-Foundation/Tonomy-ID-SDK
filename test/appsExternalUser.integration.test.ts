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
    ensureBaseTokenDeployed,
    getProvider,
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
    getProtectedCommunication,
    loginToExternalApp,
} from './helpers/externalUser';
import { createStorageFactory } from './helpers/storageFactory';
import { createSigner, getTokenContract, getTonomyOperationsKey } from '../src/sdk/services/blockchain';
import { setTestSettings, settings } from './helpers/settings';
import Debug from 'debug';
import Decimal from 'decimal.js';
import { AppsExternalUser } from '../src/api/appsExternalUser';
import { ethers } from 'ethers';

const debug = Debug('tonomy-sdk-tests:externalUser.integration.test');

setTestSettings();

const tonomySigner = createSigner(getTonomyOperationsKey());

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
    const userBasePrivateKey = '0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0'; // Hardhat account #18. TODO: change this to a random address (need to send ETH to it in tests)
    const userBaseSigner: ethers.Signer = new ethers.Wallet(userBasePrivateKey, getProvider());
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

        // assign user Base address and check contract
        userBaseAddress = await userBaseSigner.getAddress();
        await ensureBaseTokenDeployed();

        // send $TONO to user on Tonomy chain
        await getTokenContract().transfer('ops.tmy', await TONOMY_ID_user.getAccountName(), '10.000000 TONO', "", tonomySigner);
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

    describe('SwapToken services are working', () => {
        const loginToExternalAppAssertions = 27;

        test('should swap a token to the Base network and back again', async () => {
            expect.assertions(loginToExternalAppAssertions + 4);
            await setAppsExternalUser();
            const amount = new Decimal("2.5"); // amount to swap
            const amountWeiBigInt = BigInt(amount.mul(10**18).toString());

            const tonomyAccountName = await APPS_EXTERNAL_WEBSITE_user.getAccountName()
            
            const balanceBeforeBase = await getBaseTokenContract().balanceOf(userBaseAddress);            
            const balanceBeforeTonomy = await getTokenContract().getBalanceDecimal(tonomyAccountName);

            const proof = await createSignedProofMessage(userBaseSigner)

            const tonomyAppsWebsiteUsername = await externalApp.username?.getBaseUsername();

            await APPS_EXTERNAL_WEBSITE_user.swapToken(amount, proof, 'base', tonomyAppsWebsiteUsername);

            const balanceAfterBase = await getBaseTokenContract().balanceOf(userBaseAddress);
            const balanceAfterTonomy = await getTokenContract().getBalanceDecimal(tonomyAccountName);

            expect(balanceAfterBase).toEqual(balanceBeforeBase + amountWeiBigInt);
            expect(balanceAfterTonomy).toEqual(balanceBeforeTonomy.sub(amount));

            const proof2 = await createSignedProofMessage(userBaseSigner)

            await APPS_EXTERNAL_WEBSITE_user.swapToken(amount, proof2, 'tonomy', tonomyAppsWebsiteUsername);

            const balanceAfter2Base = await getBaseTokenContract().balanceOf(userBaseAddress);
            const balanceAfter2Tonomy = await getTokenContract().getBalanceDecimal(tonomyAccountName);

            expect(balanceAfter2Base).toEqual(balanceBeforeBase);
            expect(balanceAfter2Tonomy).toEqual(balanceBeforeTonomy);
        });

        test('should fail to swap a token if not enough balance on Tonomy', async () => {
            expect.assertions(loginToExternalAppAssertions + 1);
            await setAppsExternalUser();
            const amount = new Decimal("2000"); // amount to swap
            
            const proof = await createSignedProofMessage(userBaseSigner)
            const tonomyAppsWebsiteUsername = await externalApp.username?.getBaseUsername();

            try {
                await APPS_EXTERNAL_WEBSITE_user.swapToken(amount, proof, 'base', tonomyAppsWebsiteUsername);
            } catch (error) {
                expect(error.message).toContain('assertion failure with message: overdrawn balance')
            }
        });

        test('should fail to swap a token if not enough balance on Base', async () => {
            expect.assertions(loginToExternalAppAssertions + 1);
            await setAppsExternalUser();
            const amount = new Decimal("2"); // amount to swap
            
            const proof = await createSignedProofMessage(userBaseSigner)
            const tonomyAppsWebsiteUsername = await externalApp.username?.getBaseUsername();

            await APPS_EXTERNAL_WEBSITE_user.swapToken(amount, proof, 'base', tonomyAppsWebsiteUsername);
            const amount2 = new Decimal("2000"); // amount to swap
            const proof2 = await createSignedProofMessage(userBaseSigner)

            try {
                await APPS_EXTERNAL_WEBSITE_user.swapToken(amount2, proof2, 'tonomy', tonomyAppsWebsiteUsername);
            } catch (error) {
                expect(error.message).toContain('ERC20: burn amount exceeds balance')
            }
        });
    });

    async function setAppsExternalUser() {
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
        await disconnectCommunications([getProtectedCommunication(APPS_EXTERNAL_WEBSITE_user)]);
        communicationsToCleanup.push(getProtectedCommunication(APPS_EXTERNAL_WEBSITE_user));
    }

    async function disconnectCommunications(communications: Communication[]) {
        for (const communication of communications) {
            await communication.disconnect();
        }

        debug('finished disconnecting all communications');
    }
});