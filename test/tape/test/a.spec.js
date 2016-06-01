module.exports = ({ assert, test }, a) => {
  test('true should be true', t => {
    t.plan(1)
    t.true(a.true, 'a.true is true')
  })
}