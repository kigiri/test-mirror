const ava = require('ava')
const testMirror = require('../../index.js')

testMirror({
  wrapper: (info, test, mod) => test(mod),
  srcPath: '/../core',
  rootPath: __dirname
})
