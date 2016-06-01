const tape = require('tape')
const assert = require('assert')
const testMirror = require('../../index.js')

testMirror({
  wrapper: (info, test, mod) => test({ test: tape, assert }, mod),
  srcPath: '/../core',
  rootPath: __dirname
})