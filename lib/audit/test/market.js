const au = require('../au')

module.exports = {
  markets: async () => {
    const data = await au.get('/markets')

    au.assert(data.length > 0, 'Expected at least one market')
    data.forEach((m) => au.assertStringProperty(m, 'id'))
    data.forEach((m) => au.assertStringProperty(m, 'base', {required: false}))
    data.forEach((m) => au.assertStringProperty(m, 'quote', {required: false}))

    const idCounts = data.reduce((memo, m) => {
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
}
