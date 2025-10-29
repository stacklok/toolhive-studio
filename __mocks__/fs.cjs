// Mock for node:fs using memfs
// See: https://vitest.dev/guide/mocking/file-system.html

const { fs } = require('memfs')
module.exports = fs
