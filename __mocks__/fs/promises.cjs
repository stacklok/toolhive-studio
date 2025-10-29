// Mock for node:fs/promises using memfs
// See: https://vitest.dev/guide/mocking/file-system.html

const { fs } = require('memfs')
module.exports = fs.promises
