import 'reflect-metadata';
import { setTestSettings } from './helpers/settings';
import { TextEncoder, TextDecoder } from 'util';
import { jest } from '@jest/globals';

global.TextEncoder = TextEncoder;
// @ts-expect-error TextDecoder type error
global.TextDecoder = TextDecoder;

// Mocking ws module
jest.mock('ws', () => {
    return {
        WebSocket: jest.fn().mockImplementation(() => {
            // Mock implementation or return value
        }),
    };
});
setTestSettings();
