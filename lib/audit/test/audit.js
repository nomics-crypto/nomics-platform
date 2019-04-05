const au = require('../au')

const MINUTE = 1000 * 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24

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
      au.assertBooleanProperty(capability, 'candles', { required: false })
      au.assertBooleanProperty(capability, 'markets', { required: false })
      au.assertBooleanProperty(capability, 'orders', { required: false })
      au.assertBooleanProperty(capability, 'ordersSnapshot', { required: false })
      au.assertBooleanProperty(capability, 'ordersSocket', { required: false })
      au.assertBooleanProperty(capability, 'ticker', { required: false })
      au.assertBooleanProperty(capability, 'trades', { required: false })
      au.assertBooleanProperty(capability, 'tradesByTimestamp', { required: false })
      au.assertBooleanProperty(capability, 'tradesSocket', { required: false })
    }

    au.assert(
      this.info.capability.trades ||
        this.info.capability.tradesByTimestamp ||
        this.info.capability.orders ||
        this.info.capability.ordersSnapshot ||
        this.info.capability.ticker ||
        this.info.capability.candles,
      'Expected at least one data capability of trades, candles, orders, or ticker'
    )
  },

  markets: async () => {
    if (!this.info.capability || !this.info.capability.markets) {
      return
    }

    const data = await au.get('/markets')

    au.assert(data.length > 0, 'Expected at least one market')
    data.forEach(m => au.assertStringProperty(m, 'id'))
    data.forEach(m => au.assertStringProperty(m, 'base', { required: false }))
    data.forEach(m => au.assertStringProperty(m, 'quote', { required: false }))

    const idCounts = data.reduce((memo, m) => {
      if (!memo[m.id]) {
        memo[m.id] = 0
      }
      memo[m.id]++
      return memo
    }, {})
    Object.keys(idCounts).forEach(id => {
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
    trades.forEach(t => au.assertStringProperty(t, 'id'))
    trades.forEach(t => au.assertTimestampProperty(t, 'timestamp'))
    trades.forEach(t => au.assertNumericStringProperty(t, 'price'))
    trades.forEach(t => au.assertNumericStringProperty(t, 'amount'))
    trades.forEach(t => au.assertStringProperty(t, 'order', { required: false }))
    trades.forEach(t => au.assertPropertyInSet(t, 'type', ['market', 'limit', 'ask', 'bid'], { required: false }))
    trades.forEach(t => au.assertPropertyInSet(t, 'side', ['buy', 'sell'], { required: false }))

    const since = trades[0].id
    const second = await au.get(`/trades?market=${encodeURIComponent(market.id)}&since=${since}`)
    au.assert(second.length > 0, `Trades with since=${since} didn't return any trades`)
    au.assert(
      !second.find(t => t.id === since),
      `Trades with since=${since} contained a trade with the same id as the since parameter. Only trades *after* the since id should be returned`
    )
    au.assert(
      second.find(t => t.id === trades[1].id),
      `Trades with since=${since} didn't contain an overlap with the first page. Expected to see trade with id ${
        trades[1].id
      }`
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
    trades.forEach(t => au.assertStringProperty(t, 'id'))
    trades.forEach(t => au.assertTimestampProperty(t, 'timestamp'))
    trades.forEach(t => au.assertNumericStringProperty(t, 'price'))
    trades.forEach(t => au.assertNumericStringProperty(t, 'amount'))
    trades.forEach(t => au.assertStringProperty(t, 'order', { required: false }))
    trades.forEach(t => au.assertPropertyInSet(t, 'type', ['market', 'limit', 'ask', 'bid'], { required: false }))
    trades.forEach(t => au.assertPropertyInSet(t, 'side', ['buy', 'sell'], { required: false }))

    const since = trades[0].timestamp
    const second = await au.get(
      `/trades-by-timestamp?market=${encodeURIComponent(market.id)}&since=${encodeURIComponent(since)}`
    )
    au.assert(second.length > 0, `Trades with since=${since} didn't return any trades`)
    au.assert(
      !second.find(t => t.timestamp < trades[0].timestamp),
      `Trades with since=${
        trades[0].id
      } contained a trade with a timestamp before the since parameter. Only trades *after or equal to* the since id should be returned`
    )
    au.assert(
      second.find(t2 => t2.id === trades.find(t => t.timestamp > since).id),
      `Trades with since=${trades[0].id} didn't contain an overlap with the first page. Expected to see trade with id ${
        trades[1].id
      }`
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

    const bidPrices = orderBook.bids.map(b => b[0])
    const bidPricesSorted = orderBook.bids.map(b => b[0]).sort((a, b) => b - a)
    au.assert(
      JSON.stringify(bidPrices) === JSON.stringify(bidPricesSorted),
      'Expected bids to be sorted by price descending'
    )

    const askPrices = orderBook.asks.map(b => b[0])
    const askPricesSorted = orderBook.asks.map(b => b[0]).sort((a, b) => a - b)
    au.assert(
      JSON.stringify(askPrices) === JSON.stringify(askPricesSorted),
      'Expected asks to be sorted by price ascending'
    )
  },

  candles: async () => {
    if (!this.info.capability || !this.info.capability.candles) {
      return
    }

    const markets = await au.get('/markets')
    if (markets.length === 0) {
      // If there are no markets, pass, since markets spec will fail
      return
    }

    const market = markets[0]
    const intervals = ['1d', '1h', '1m']

    for (const interval of intervals) {
      let candles

      try {
        candles = await au.get(`/candles?market=${encodeURIComponent(market.id)}&interval=${interval}`)
      } catch (e) {
        if (interval === '1d') {
          au.assert(false, 'Expected to find candles endpoint for interval `1d`')
        } else {
          return // other candles endpoints are optional
        }
      }

      const c = JSON.parse(JSON.stringify(candles)) // deep clone
      let t = candles.map(c => c.timestamp)
      let tSorted = c.map(c => c.timestamp).sort()

      au.assert(
        JSON.stringify(t) === JSON.stringify(tSorted),
        `Expected ${interval} candles to be sorted by timestamp ascending`
      )

      if (interval === '1d') {
        au.assert(candles.length >= 7, 'Expected at least 7 1d candles')
        au.assert(
          new Date(candles[candles.length - 1].timestamp).getTime() > new Date().getTime() - 2 * DAY,
          'Expected last 1d candle to be within the last 48 hours'
        )
      }

      if (interval === '1h') {
        au.assert(candles.length >= 24, 'Expected at least 24 1h candles')
        au.assert(
          new Date(candles[candles.length - 1].timestamp).getTime() > new Date().getTime() - 2 * HOUR,
          'Expected last 1h candle to be within the last 2 hours'
        )
      }

      if (interval === '1m') {
        au.assert(candles.length >= 60, 'Expected at least 60 1m candles')
        au.assert(
          new Date(candles[candles.length - 1].timestamp).getTime() > new Date().getTime() - 10 * MINUTE,
          'Expected last 1m candle to be within the last 10 minutes'
        )
      }

      candles.forEach(c => {
        au.assertTimestampProperty(c, 'timestamp')

        let date = new Date(c.timestamp)

        if (interval === '1d') {
          au.assert(date.getTime() % DAY === 0, 'Expected timestamp to aligned to day candle size in UTC')
        }

        if (interval === '1h') {
          au.assert(date.getTime() % HOUR === 0, 'Expected timestamp to aligned to hour candle size in UTC')
        }

        if (interval === '1d') {
          au.assert(date.getTime() % MINUTE === 0, 'Expected timestamp to aligned to minute candle size in UTC')
        }
      })

      candles.forEach(c => au.assertNumericStringProperty(c, 'open'))

      candles.forEach(c => {
        au.assertNumericStringProperty(c, 'high')
        au.assert(parseFloat(c.high) >= parseFloat(c.open), 'Expected high to be greater than or equal to open')
        au.assert(parseFloat(c.high) >= parseFloat(c.close), 'Expected high to be greater than or equal to close')
        au.assert(parseFloat(c.high) >= parseFloat(c.low), 'Expected high to be greater than or equal to low')
      })

      candles.forEach(c => {
        au.assertNumericStringProperty(c, 'low')
        au.assert(parseFloat(c.low) > 0, 'Expected low to be greater than 0')
        au.assert(parseFloat(c.low) <= parseFloat(c.open), 'Expected low to be less than or equal to open')
        au.assert(parseFloat(c.low) <= parseFloat(c.close), 'Expected low to be less than or equal to close')
        au.assert(parseFloat(c.low) <= parseFloat(c.high), 'Expected low to be less than or equal to high')
      })

      candles.forEach(c => au.assertNumericStringProperty(c, 'close'))

      candles.forEach(c => {
        au.assertNumericStringProperty(c, 'volume')
        au.assert(parseFloat(c.volume) >= 0, 'Expected volume to be greater than or equal to 0')
      })
    }
  },

  ticker: async () => {
    if (!this.info.capability || !this.info.capability.ticker) {
      return
    }

    const markets = await au.get('/markets')
    if (markets.length === 0) {
      // If there are no markets, pass, since markets spec will fail
      return
    }

    const market = markets[0]
    const ticker = await au.get(`/ticker?market=${encodeURIComponent(market.id)}`)

    au.assert(ticker !== null, `Expected a ticker response for market ${market.id}`)

    au.assertNumericStringProperty(ticker, 'ask', { required: false })
    au.assertNumericStringProperty(ticker, 'bid', { required: false })
    au.assertNumericStringProperty(ticker, 'close', { required: true })
    au.assertNumericStringProperty(ticker, 'high', { required: true })
    au.assertNumericStringProperty(ticker, 'low', { required: true })
    au.assertProperty(ticker, 'raw', { required: true })
    au.assertTimestampProperty(ticker, 'timestamp', { required: true })

    if (
      au.assertNumericStringProperty(ticker, 'bid', { required: false }) &&
      au.assertNumericStringProperty(ticker, 'ask', { required: false })
    ) {
      au.assert(Number(ticker.bid) < Number(ticker.ask), 'Expected ask to be greater than bid')
    }
    au.assert(Number(ticker.high) > Number(ticker.low), 'Expected high to be higher than low')
    au.assert(Number(ticker.close) <= Number(ticker.high), 'Expected close to be less than or equal to high')
    au.assert(Number(ticker.close) >= Number(ticker.low), 'Expected close to be greater than or equal to low')
  }
}
