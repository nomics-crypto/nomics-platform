const moment = require('moment')
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
      au.assertPropertyInSet(capability, 'candles', ['1d', '1h', '1m'], { required: false })
    }
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
      !second.find(t => t.id === trades[0].id),
      `Trades with since=${
        trades[0].id
      } contained a trade with the same id as the since parameter. Only trades *after* the since id should be returned`
    )
    au.assert(
      second.find(t => t.id === trades[1].id),
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

    await Promise.all(
      intervals.map(async interval => {
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
            new Date(candles[candles.length - 1].timestamp).getTime() ===
              moment()
                .utc()
                .startOf('day')
                .toDate()
                .getTime(),
            `Expected last 1d candle to be current day UTC: ${JSON.stringify(candles[candles.length - 1])}`
          )
          au.assert(
            new Date(candles[candles.length - 2].timestamp).getTime() ===
              moment()
                .utc()
                .subtract(1, 'day')
                .startOf('day')
                .toDate()
                .getTime(),
            'Expected next to last 1d candle to be previous day UTC'
          )
        }

        if (interval === '1h') {
          au.assert(candles.length >= 24, 'Expected at least 24 1h candles')
          au.assert(
            new Date(candles[candles.length - 1].timestamp).getTime() ===
              moment()
                .utc()
                .startOf('hour')
                .toDate()
                .getTime(),
            `Expected last 1h candle to be current hour UTC: ${JSON.stringify(candles[candles.length - 1])}`
          )
          au.assert(
            new Date(candles[candles.length - 2].timestamp).getTime() ===
              moment()
                .utc()
                .subtract(1, 'hour')
                .startOf('hour')
                .toDate()
                .getTime(),
            'Expected next to last 1h candle to be previous hour UTC'
          )
        }

        if (interval === '1m') {
          au.assert(candles.length >= 60, 'Expected at least 60 1m candles')
        }

        candles.forEach(c => {
          au.assertTimestampProperty(c, 'timestamp')

          let date = new Date(c.timestamp)

          if (interval === '1d') {
            au.assert(date.getUTCHours() === 0, 'Expected timestamp hours to aligned to candle size in UTC')
          }

          if (['1d', '1h'].includes(interval)) {
            au.assert(date.getUTCMinutes() === 0, 'Expected timestamp minutes to aligned to candle size in UTC')
          }

          if (['1d', '1h', '1m'].includes(interval)) {
            au.assert(date.getUTCSeconds() === 0, 'Expected timestamp seconds to aligned to candle size in UTC')
          }

          au.assert(date.getUTCMilliseconds() === 0, 'Expected timestamp milliseconds to align to candle size in UTC')
        })

        candles.forEach(c => au.assertNumericStringProperty(c, 'open'))
        candles.forEach(c => au.assertNumericStringProperty(c, 'high'))
        candles.forEach(c => au.assertNumericStringProperty(c, 'low'))
        candles.forEach(c => au.assertNumericStringProperty(c, 'close'))
        candles.forEach(c => au.assertNumericStringProperty(c, 'volume'))
      })
    )
  }
}
