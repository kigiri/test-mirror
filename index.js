"use strict"
const fs = require('fs')
const assert = require('assert')
const path = require('path')
const join = path.join
const relative = path.relative

const lstat = a => new Promise((s, f) =>
  fs.lstat(a, (e, r) => e ? f(e) : s(r)))

const readdir = a => new Promise((s, f) =>
  fs.readdir(a, (e, r) => e ? f(e) : s(r)))

const eachJsFiles = (dirname, fn) => readdir(dirname)
  .then(files => files.map(f => join(dirname, f)))
  .then(files => Promise.all(files.map(filename => lstat(filename)
    .then(stats => stats.isDirectory()
      ? eachJsFiles(filename, fn)
      : fn(filename, stats)))))

const isFn = fn => typeof fn === 'function'

const isInMocha = () => Boolean(process.argv.map(p => p.split(path.sep))
  .map(p => p.slice(p.length - 2).join('').replace('_', ''))
  .filter(p => p === 'binmocha').length)

const mochaGlobals = [
  'after',
  'afterEach',
  'before',
  'beforeEach',
  'context',
  'describe',
  'it',
  'setup',
  'suite',
  'suiteSetup',
  'suiteTeardown',
  'teardown',
  'test',
]

const noFile = () => { throw Error('no test file !') }
const isStr = str => typeof str === 'string'

let called = false

process.nextTick(() => {
  if (!called)
  init({})
})

const init = opts => {
  called = true
  opts || (opts = {})
  const rootDir = isStr(opts.rootPath)
    ? opts.rootPath
    : __dirname.slice(0, __dirname.lastIndexOf('node_modules'))

  const suffix = isStr(opts.suffix) ? opts.suffix : '.spec'
  const testDir = isStr(opts.testPath) ? opts.testPath : 'test'
  const srcDir = isStr(opts.srcPath) ? opts.srcPath : 'core'
  const testPath = join(rootDir, testDir)
  const srcPath = join(rootDir, srcDir)
  const getTestPath = filename => join(testPath, filename.slice(srcPath.length, -3))
  const fireEvent = (fn, value, fallback) => isFn(fn)
    ? fn(value)
    : isFn(fallback) ? fallback(value) : value

  opts.args || (opts.args = { assert })

  const addInfo = (src, filename) => {
    src.name = filename.slice(srcPath.length + 1)
    src.srcPath = filename
    src.testPath = getTestPath(filename) + suffix
    return src
  }

  const startTests = () => eachJsFiles(srcPath, filename => {
    if (!/\.js$/.test(filename)) return
    const _module = require(filename)

    try {
      const testForModule = require(getTestPath(filename) + suffix)
      if (!isFn(opts.wrapper)) return testForModule(opts.args, _module)
      opts.wrapper(addInfo({}, filename), () => testForModule(opts.args, _module))
    }

    catch (err) {
      err.testNotFound = err.code === 'MODULE_NOT_FOUND'
      fireEvent(opts.onFailingTest, addInfo(err, filename), () => err.testNotFound
        ? console.log('No tests found for "'+ err.name +'"')
        : console.log('Unexpected error testing file "'+ err.name
          +'" :\n'+ err.stack))
    }
  })

  if (isInMocha()) {
    if (!isFn(opts.wrapper)) {
      opts.wrapper = (info, fn) => describe('Testing module '+ info.name, () => {
        if (info.testNotFound) {
          return it.skip('Tests missing', noFile)
        }
        try {
          return fn()
        } catch (err) {
          return it('should load the tests properly', () => { throw err })
        }
      })
    }
    const fail = isFn(opts.onFailingTest) ? opts.onFailingTest : () => {}
    opts.onFailingTest = err => err.testNotFound
      && opts.wrapper(err)
    mochaGlobals.forEach(key => opts.args[key] === undefined
      ? opts.args[key] = global[key]
      : opts.args['_'+ key] = global[key])

    return describe('Preparation',
      () => it('Resolving files to test', startTests))
  }
  return startTests()
}

module.exports = init