
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./tonomy-id-sdk.cjs.production.min.js')
} else {
  module.exports = require('./tonomy-id-sdk.cjs.development.js')
}
