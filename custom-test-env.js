/* eslint-disable @typescript-eslint/no-var-requires */
import pkg from 'jest-environment-jsdom';
import { TextEncoder, TextDecoder } from 'util';

let JSDOMEnvironment = pkg;

if (pkg.default) {
    JSDOMEnvironment = pkg.default;
}

export default class CustomizedJSDomEnvironment extends JSDOMEnvironment {
    constructor(config, context) {
        super(config, context);
        this.global.jsdom = this.dom;
    }

    async setup() {
        await super.setup();
        this.global.jsdom = this.dom;

        if (typeof this.global.TextEncoder === 'undefined') {
            this.global.TextDecoder = TextDecoder;
            this.global.TextEncoder = TextEncoder;
        }
    }

    async teardown() {
        this.global.jsdom = null;
        await super.teardown();
    }
}
