import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';

const jsdom = new JSDOM();

// @ts-expect-error Window typerror
jest.spyOn(global, 'window', 'get').mockReturnValue(jsdom.window);

export function setUrl(url: string): void {
    jsdom.reconfigure({
        url,
    });
}

export function setReferrer(referrer: string): void {
    jest.spyOn(document, 'referrer', 'get').mockReturnValue(referrer);
}