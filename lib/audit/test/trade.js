const au = require('../au')

module.exports = {
  trades: async () => {
    const markets = await au.get('/markets')
    if (markets.length === 0) {
      // If there are no markets, pass, since markets spec will fail
      return
    }
    const market = markets[0]

    const trades = await au.get(`/trades?market=${encodeURIComponent(market.id)}`)
    au.assert(trades.length > 2, 'Expected more than two trades')
    trades.forEach((t) => au.assertStringProperty(t, 'id'))
    trades.forEach((t) => au.assertTimestampProperty(t, 'timestamp'))
    trades.forEach((t) => au.assertNumericStringProperty(t, 'price'))
    trades.forEach((t) => au.assertNumericStringProperty(t, 'amount'))
    trades.forEach((t) => au.assertStringProperty(t, 'order', {required: false}))
    trades.forEach((t) => au.assertPropertyInSet(t, 'type', ['market', 'limit', 'ask', 'bid'], {required: false}))
    trades.forEach((t) => au.assertPropertyInSet(t, 'side', ['buy', 'sell'], {required: false}))

    const second = await au.get(`/trades?market=${encodeURIComponent(market.id)}&since=${trades[0].id}`)
    au.assert(
      !second.find((t) => t.id === trades[0].id),
      `Trades with since=${trades[0].id} contained a trade with the same id as the since parameter. Only trades *after* the since id should be returned`
    )
    au.assert(
      second.find((t) => t.id === trades[1].id),
      `Trades with since=${trades[0].id} didn't contain an overlap with the first page. Expected to see trade with id ${trades[1].id}`
    )
  }
}
