/* eslint-disable @typescript-eslint/no-var-requires */
const JSDOMEnvironment = require('jest-environment-jsdom');

module.exports = class CustomizedJSDomEnvironment extends JSDOMEnvironment {
    constructor(config, context) {
        super(config, context);
        this.global.jsdom = this.dom;
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

    teardown() {
        this.global.jsdom = null;
        return super.teardown();
    }
};

// module.exports = class CustomTestEnvironment extends JSDOMEnvironment {
//     async setup() {
//         await super.setup();
//         if (typeof this.global.TextEncoder === 'undefined') {
//             const { TextEncoder, TextDecoder } = require('util');

//             this.global.TextDecoder = TextDecoder;
//             this.global.TextEncoder = TextEncoder;
//         }
//     }
// };
