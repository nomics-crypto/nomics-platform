const au = require('../au')

module.exports = {
  beforeAll: async () => {
    try {
      this.info = await au.get('/info')
    } catch (err) {
      console.log('Error fetching /info', err)
      throw err
    }
  },

  info: async () => {
    au.assertStringProperty(this.info, 'name')
    au.assertStringProperty(this.info, 'description', { required: false })
    au.assertURLProperty(this.info, 'logo', { required: false })
    au.assertURLProperty(this.info, 'website', { required: false })
    au.assertStringProperty(this.info, 'twitter', { required: false })
    if (au.assertProperty(this.info, 'capability', { required: false })) {
      au.assertPropertyType(this.info, 'capability', 'object')
      const capability = this.info.capability
      au.assertBooleanProperty(capability, 'markets', { required: false })
      au.assertBooleanProperty(capability, 'trades', { required: false })
      au.assertBooleanProperty(capability, 'tradesByTimestamp', { required: false })
      au.assertBooleanProperty(capability, 'tradesSocket', { required: false })
      au.assertBooleanProperty(capability, 'orders', { required: false })
      au.assertBooleanProperty(capability, 'ordersSocket', { required: false })
      au.assertBooleanProperty(capability, 'ordersSnapshot', { required: false })
      au.assertBooleanProperty(capability, 'candles', { required: false })
    }
  },

  markets: async () => {
    if (!this.info.capability || !this.info.capability.markets) {
      return
    }

    const data = await au.get('/markets')

    au.assert(data.length > 0, 'Expected at least one market')
    data.forEach((m) => au.assertStringProperty(m, 'id'))
    data.forEach((m) => au.assertStringProperty(m, 'base', { required: false }))
    data.forEach((m) => au.assertStringProperty(m, 'quote', { required: false }))

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
  },

  trades: async () => {
    if (!this.info.capability || !this.info.capability.markets || !this.info.capability.trades) {
      return
    }

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
    trades.forEach((t) => au.assertStringProperty(t, 'order', { required: false }))
    trades.forEach((t) => au.assertPropertyInSet(t, 'type', ['market', 'limit', 'ask', 'bid'], { required: false }))
    trades.forEach((t) => au.assertPropertyInSet(t, 'side', ['buy', 'sell'], { required: false }))

    const since = trades[0].id
    const second = await au.get(`/trades?market=${encodeURIComponent(market.id)}&since=${since}`)
    au.assert(second.length > 0, `Trades with since=${since} didn't return any trades`)
    au.assert(
      !second.find((t) => t.id === since),
      `Trades with since=${since} contained a trade with the same id as the since parameter. Only trades *after* the since id should be returned`
    )
    au.assert(
      second.find((t) => t.id === trades[1].id),
      `Trades with since=${since} didn't contain an overlap with the first page. Expected to see trade with id ${trades[1].id}`
    )
  },

  tradesByTimestamp: async () => {
    if (!this.info.capability || !this.info.capability.markets || !this.info.capability.tradesByTimestamp) {
      return
    }

    const markets = await au.get('/markets')
    if (markets.length === 0) {
      // If there are no markets, pass, since markets spec will fail
      return
    }
    const market = markets[0]

    const trades = await au.get(`/trades-by-timestamp?market=${encodeURIComponent(market.id)}`)
    au.assert(trades.length > 2, 'Expected more than two trades')
    trades.forEach((t) => au.assertStringProperty(t, 'id'))
    trades.forEach((t) => au.assertTimestampProperty(t, 'timestamp'))
    trades.forEach((t) => au.assertNumericStringProperty(t, 'price'))
    trades.forEach((t) => au.assertNumericStringProperty(t, 'amount'))
    trades.forEach((t) => au.assertStringProperty(t, 'order', { required: false }))
    trades.forEach((t) => au.assertPropertyInSet(t, 'type', ['market', 'limit', 'ask', 'bid'], { required: false }))
    trades.forEach((t) => au.assertPropertyInSet(t, 'side', ['buy', 'sell'], { required: false }))

    const since = trades[0].timestamp
    const second = await au.get(`/trades-by-timestamp?market=${encodeURIComponent(market.id)}&since=${encodeURIComponent(since)}`)
    au.assert(second.length > 0, `Trades with since=${since} didn't return any trades`)
    au.assert(
      !second.find((t) => t.id === trades[0].id),
      `Trades with since=${trades[0].id} contained a trade with the same id as the since parameter. Only trades *after* the since id should be returned`
    )
    au.assert(
      second.find((t) => t.id === trades[1].id),
      `Trades with since=${trades[0].id} didn't contain an overlap with the first page. Expected to see trade with id ${trades[1].id}`
    )
  },

  ordersSnapshot: async () => {
    if (!this.info.capability || !this.info.capability.markets || !this.info.capability.ordersSnapshot) {
      return
    }

    const markets = await au.get('/markets')
    if (markets.length === 0) {
      // If there are no markets, pass, since markets spec will fail
      return
    }
    const market = markets[0]

    const orderBook = await au.get(`/orders/snapshot?market=${encodeURIComponent(market.id)}`)
    au.assertTimestampProperty(orderBook, 'timestamp')
    au.assertArrayProperty(orderBook, 'bids')
    au.assertArrayProperty(orderBook, 'asks')

    const bidPrices = orderBook.bids.map((b) => b[0])
    const bidPricesSorted = orderBook.bids.map((b) => b[0]).sort((a, b) => b - a)
    au.assert(
      JSON.stringify(bidPrices) === JSON.stringify(bidPricesSorted),
      'Expected bids to be sorted by price descending'
    )

    const askPrices = orderBook.asks.map((b) => b[0])
    const askPricesSorted = orderBook.asks.map((b) => b[0]).sort((a, b) => a - b)
    au.assert(
      JSON.stringify(askPrices) === JSON.stringify(askPricesSorted),
      'Expected asks to be sorted by price ascending'
    )
  }
}
