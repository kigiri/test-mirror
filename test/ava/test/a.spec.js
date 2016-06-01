const test = require('ava')

module.exports = a => {
  test('true should be true', t => t.true(a.true))
}