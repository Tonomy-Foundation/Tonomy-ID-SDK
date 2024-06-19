import 'reflect-metadata';
import { setTestSettings } from './helpers/settings';
import { TextEncoder, TextDecoder } from 'util';
import { jest } from '@jest/globals';

// Object.assign(global, { TextDecoder, TextEncoder });
global.TextEncoder = TextEncoder;
// @ts-expect-error TextDecoder bs...
global.TextDecoder = TextDecoder;

jest.mock('ws', () => {
    return {
        WebSocket: jest.fn().mockImplementation(() => {
            // Mock implementation or return value
        }),
    };
});

setTestSettings();
