/* eslint-disable @typescript-eslint/no-var-requires */
const pkg = require('jest-environment-jsdom');

let JSDOMEnvironment = pkg;

if (pkg.default) {
    JSDOMEnvironment = pkg.default;
}

module.exports = class CustomizedJSDomEnvironment extends JSDOMEnvironment {
    constructor(config, context) {
        super(config, context);
        this.global.jsdom = this.dom;
    }
    getVmContext() {
        return super.getVmContext();
    }
    async setup() {
        await super.setup();
        this.global.jsdom = this.dom;

        if (typeof this.global.TextEncoder === 'undefined') {
            const { TextEncoder, TextDecoder } = require('util');

            this.global.TextDecoder = TextDecoder;
            this.global.TextEncoder = TextEncoder;
        }
    }

    async teardown() {
        this.global.jsdom = null;
        await super.teardown();
    }
};
