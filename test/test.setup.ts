import 'reflect-metadata';
import { setTestSettings } from './helpers/settings';
import { TextEncoder, TextDecoder, inspect } from 'util';
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
    const logLines: string[] = [];

    const timeoutMinutes = 40;

    const timer: NodeJS.Timeout = setTimeout(
        () => {
            logLines.push(`[TestRuntimeGuard] Exceeded max test runtime (${timeoutMinutes} minutes). Forcing exit.`);

            try {
                const getActiveHandles = (process as unknown as { _getActiveHandles?: () => unknown[] })
                    ._getActiveHandles;
                const handles = getActiveHandles ? getActiveHandles() : [];

                logLines.push(`[TestRuntimeGuard] Active handles count: ${handles.length}`);
                logLines.push(...handles.map(printableHandleDetails));
            } catch {
                // ignore diagnostics errors
            }

            console.error(logLines.join('\n'));
            process.exit(1); // hard exit so CI flags failure
        },
        60 * 1000 * timeoutMinutes
    );

    // Do not keep process alive solely for this timer
    // (unref may be undefined in some environments)
    (timer as unknown as { unref?: () => void }).unref?.();
})();

// Extracts and formats some details about a handle for logging purposes
// (best-effort, ignores any errors)
function printableHandleDetails(h: unknown, i: number): string {
    const ctor: unknown = (h as { constructor?: { name?: string } })?.constructor;
    const name = (ctor && (ctor as { name?: string }).name) || typeof h;

    const detailLines: string[] = [];

    try {
        // Generic properties
        if (h && typeof h === 'object') {
            const anyH = h as Record<string, any>;

            // Timers (Timeout / Immediate / Interval)
            if ('_idleTimeout' in anyH) {
                detailLines.push(`idleTimeout=${anyH._idleTimeout}`);
                if ('_idleStart' in anyH) detailLines.push(`idleStart=${anyH._idleStart}`);
                if ('_destroyed' in anyH) detailLines.push(`destroyed=${anyH._destroyed}`);
            }

            // Server (net.Server / http.Server)
            if ('listening' in anyH && typeof anyH.address === 'function') {
                detailLines.push(`listening=${anyH.listening}`);

                try {
                    const addr = anyH.address();

                    if (addr) detailLines.push(`address=${JSON.stringify(addr)}`);
                } catch {
                    // ignore address() errors
                }

                if ('connections' in anyH) detailLines.push(`connections=${anyH.connections}`);
                if ('_connectionKey' in anyH) detailLines.push(`connectionKey=${anyH._connectionKey}`);
            }

            // Socket (net.Socket / TLSSocket)
            if ('remoteAddress' in anyH || 'localAddress' in anyH) {
                if ('localAddress' in anyH) detailLines.push(`local=${anyH.localAddress}:${anyH.localPort}`);
                if ('remoteAddress' in anyH) detailLines.push(`remote=${anyH.remoteAddress}:${anyH.remotePort}`);
                if ('readyState' in anyH) detailLines.push(`readyState=${anyH.readyState}`);
                if ('bytesRead' in anyH) detailLines.push(`bytesRead=${anyH.bytesRead}`);
                if ('bytesWritten' in anyH) detailLines.push(`bytesWritten=${anyH.bytesWritten}`);
                if ('pending' in anyH) detailLines.push(`pending=${anyH.pending}`);
                if ('connecting' in anyH) detailLines.push(`connecting=${anyH.connecting}`);
                if ('destroyed' in anyH) detailLines.push(`destroyed=${anyH.destroyed}`);
                if ('remoteFamily' in anyH) detailLines.push(`remoteFamily=${anyH.remoteFamily}`);
                if ('localFamily' in anyH) detailLines.push(`localFamily=${anyH.localFamily}`);
                if ('bufferSize' in anyH) detailLines.push(`bufferSize=${anyH.bufferSize}`);
                if ('writableLength' in anyH) detailLines.push(`writableLength=${anyH.writableLength}`);
                if ('readableLength' in anyH) detailLines.push(`readableLength=${anyH.readableLength}`);
                if ('writableFinished' in anyH) detailLines.push(`writableFinished=${anyH.writableFinished}`);
                if ('writableEnded' in anyH) detailLines.push(`writableEnded=${anyH.writableEnded}`);
                if ('readable' in anyH) detailLines.push(`readable=${anyH.readable}`);
                if ('writable' in anyH) detailLines.push(`writable=${anyH.writable}`);
            }

            // ChildProcess
            if ('pid' in anyH && ('spawnfile' in anyH || 'spawnargs' in anyH)) {
                detailLines.push(`pid=${anyH.pid}`);
                if ('spawnfile' in anyH) detailLines.push(`spawnfile=${anyH.spawnfile}`);
                if ('spawnargs' in anyH) detailLines.push(`spawnargs=${JSON.stringify(anyH.spawnargs)}`);
                if ('connected' in anyH) detailLines.push(`connected=${anyH.connected}`);
                if ('killed' in anyH) detailLines.push(`killed=${anyH.killed}`);
                if ('exitCode' in anyH) detailLines.push(`exitCode=${anyH.exitCode}`);
                if ('signalCode' in anyH) detailLines.push(`signal=${anyH.signalCode}`);
            }

            // FSWatcher
            if ('close' in anyH && 'start' in anyH && 'path' in anyH) {
                detailLines.push(`watchPath=${anyH.path}`);
            }

            // Promise-like (rare here)
            if (typeof (anyH as any).then === 'function') {
                detailLines.push('thenable=true');
            }

            // Ref state (if available)
            if (typeof (anyH as any).hasRef === 'function') {
                try {
                    detailLines.push(`hasRef=${(anyH as any).hasRef()}`);
                } catch {
                    // ignore hasRef() errors
                }
            }
        }

        // Fallback: minimal util.inspect (lazy load to avoid top-level import)
        if (!detailLines.length) {
            try {
                detailLines.push(
                    'inspect=' +
                        inspect(h, {
                            depth: 1,
                            maxArrayLength: 5,
                            breakLength: 80,
                        }).replace(/\s+/g, ' ')
                );
            } catch {
                // ignore inspect errors
            }
        }
    } catch {
        // ignore extraction errors
    }

    return (
        `[TestRuntimeGuard] Handle[${i}]: ${name}` + (detailLines.length ? `\n   > ${detailLines.join('\n   > ')}` : '')
    );
}
