const path = require('path');

module.exports = {
    entry: './lib/index.cjs',
    mode: 'production',
    resolve: {
        fallback: {
            crypto: false,
            // crypto: require.resolve('crypto-browserify'),
            util: false,
            // util: require.resolve('util/'),
        },
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        umdNamedDefine: true,
        library: '@tonomy/tonomy-id-sdk',
    },
};
