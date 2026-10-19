"use strict";
var assert = require('assert');
assert.strictEqual(require('../service/deviceId.cjs')('test-device'), '34050d60-983c-5286-a126-737174d85d79');
new (require('vm').Script)(require('fs').readFileSync(require('path').join(__dirname, '../dist/service.js'), 'utf8'));
console.log('PASS ' + process.version + ': service bundle syntax and stable casting ID');
