/* eslint-disable @typescript-eslint/no-var-requires */
const NodeEnvironment = require('jest-environment-node').TestEnvironment;

module.exports = class CustomizedTestEnvironment extends NodeEnvironment {
    window = {
        location: {
            origin: '',
        },
    };

    localStorage = {
        getItem: () => console.log('getItem'),
        setItem: (key, value) => console.log('setItem', key, value),
    };

    customTests = {
        setOrigin: (origin) => {
            console.log('setOrigin', origin);
            this.window.location.origin = origin;
        },
    };

    constructor(config, context) {
        super(config, context);
    }

    getVmContext() {
        return super.getVmContext();
    }

    async setup() {
        await super.setup();
        // emulte the window.location.origin
        this.global.window = this.window;
        // emulte the localStorage object
        this.global.localStorage = this.localStorage;

        // provide getters and setters
        this.global.customTests = this.customTests;
    }

    async teardown() {
        this.global.location = null;
        this.global.localStorage = null;
        await super.teardown();
    }
};
