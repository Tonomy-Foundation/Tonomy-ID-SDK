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

// Global hard cap on total test runtime to avoid indefinite hangs.
// Activated in CI environment only.
(() => {
    if (!process.env.CI) return;

    const timeoutMinutes = 60; // 1 hour

    const timer: NodeJS.Timeout = setTimeout(
        () => {
            console.error(`[TestRuntimeGuard] Exceeded max test runtime (${timeoutMinutes} minutes). Forcing exit.`);

            try {
                const getActiveHandles = (process as unknown as { _getActiveHandles?: () => unknown[] })
                    ._getActiveHandles;
                const handles = getActiveHandles ? getActiveHandles() : [];

                console.error(`[TestRuntimeGuard] Active handles count: ${handles.length}`);
                handles.forEach((h, i) => {
                    const ctor: unknown = (h as { constructor?: { name?: string } })?.constructor;
                    const name = (ctor && (ctor as { name?: string }).name) || typeof h;

                    console.error(`[TestRuntimeGuard] Handle[${i}]: ${name}`);
                });
            } catch {
                // ignore diagnostics errors
            }

            process.exit(1); // hard exit so CI flags failure
        },
        60 * 1000 * timeoutMinutes
    );

    // Do not keep process alive solely for this timer
    // (unref may be undefined in some environments)
    (timer as unknown as { unref?: () => void }).unref?.();
})();
