const au = require('../au')

module.exports = au.testEndpoint('/markets', (data) => ({
  atLeastOne: function () { au.assert(data().length > 0, 'Expected at least one market') },
  id: function () { data().forEach((m) => au.assertStringProperty(m, 'id')) },
  base: function () { data().forEach((m) => au.assertStringProperty(m, 'base', {required: false})) },
  quote: function () { data().forEach((m) => au.assertStringProperty(m, 'quote', {required: false})) },
  duplicates: function () {
    const idCounts = data().reduce((memo, m) => {
      if (!memo[m.id]) {
        memo[m.id] = 0
      }
      memo[m.id]++
      return memo
    }, {})
    Object.keys(idCounts).forEach((id) => {
      au.assert(idCounts[id] === 1, `Duplicate market ID: ${id}`)
    })
  }
}))
