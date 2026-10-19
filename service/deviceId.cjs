"use strict";
var crypto = require('crypto');
// Stable UUID v5 with the existing namespace, including Node 4.4.3 where
// Buffer.from is only the incompatible inherited Uint8Array.from. Keeping the same UUID preserves phone pairing.
module.exports = function deviceId(value) {
    var namespace = '4bcbc514bdd641638215316526fd1d9b';
    var bytes = Object.prototype.hasOwnProperty.call(Buffer, 'from') ? Buffer.from(namespace, 'hex') : new Buffer(namespace, 'hex');
    var hash = crypto.createHash('sha1').update(bytes).update(String(value), 'utf8').digest();
    hash[6] = (hash[6] & 15) | 80;
    hash[8] = (hash[8] & 63) | 128;
    var hex = hash.toString('hex').slice(0, 32);
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
};
