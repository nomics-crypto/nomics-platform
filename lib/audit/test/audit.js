const au = require('../au')

const MINUTE = 1000 * 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24

const TRADE_TYPES = [
  'market',
  'limit',
  'ask',
  'bid',
  'fill',
  'liquidation',
  'assignment'
]

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
    try {
      au.assertStringProperty(this.info, 'name')
      au.assertStringProperty(this.info, 'description', { required: true })

      if (!process.env.NOMICS_PLATFORM_RELAX) {
        au.assert(this.info.description.length >= 1000, 'Expected description to be at least 1,000 characters')

        au.assertStringProperty(this.info, 'location', { required: true })
        au.assertURLProperty(this.info, 'logo', { required: true, https: true })
      }

      au.assertURLProperty(this.info, 'website', { required: true })
      au.assertStringProperty(this.info, 'twitter', { required: false })
      au.assertStringProperty(this.info, 'version');
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
    } catch (err) {
      console.log(`FAILED: URL /info failed with "${err.message}"`)

      throw err
    }
  },

  markets: async () => {
    if (!this.info.capability || !this.info.capability.markets) {
      return
    }

    try {
      const data = await au.get('/markets');

      au.assert(data.length > 0, 'Expected at least one market');

      // required
      //
      data.forEach((m) => au.assertStringProperty(m, 'id'));
      data.forEach((t) => au.assertPropertyInSet(t, 'type', ['spot', 'derivative', 'index']));
      data.forEach((m) => au.assertStringProperty(m, 'base'));
      data.forEach((m) => au.assertStringProperty(m, 'quote'));

      // optional
      //
      data.forEach((m) => au.assertBooleanProperty(m, 'active', { required: false }));
      data.forEach((m) => au.assertStringProperty(m, 'settlement', { required: false }));
      data.forEach((m) => au.assertStringProperty(m, 'underlying', { required: false }));
      data.forEach((m) => {
        if (m.type === 'derivative') {
          au.assertPropertyInSet(m, 'subtypes', ['future', 'option', 'perpetual'], { required: false });
        } else {
          au.assertPropertyInSet(m, 'subtypes', [], { required: false });
        }
      });
      data.forEach((m) => au.assertURLProperty(m, 'market_url', { required: false }));
      data.forEach((m) => au.assertStringProperty(m, 'description', { required: false }));

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
    } catch (err) {
      console.log(`FAILED: URL /markets failed with "${err.message}"`)

      throw err
    }
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

    let success = false
    let uri

    for (let i = 0; i < markets.length && !success; i++) {
      uri = null

      try {
        const market = markets[i];
        uri = `/trades?market=${encodeURIComponent(market.id)}`;

        let trades
        try {
          trades = await au.get(uri)
        } catch (e) {
          // Used internally to mark certain adapters that do not return historical data.
          if (e.status === 410) {
            return
          }

          throw e
        }

        au.assert(trades.length > 2, 'Expected more than two trades');
        au.assert(
          !trades.find(t => new Date(t.timestamp).getTime() < new Date('2006-01-01').getTime()),
          `Trades for market=${market.id} contained a trade with a timestamp before 2006.`
        )

        trades.forEach((t) => au.assertStringProperty(t, 'id'));
        trades.forEach((t) => au.assertTimestampProperty(t, 'timestamp'));
        trades.forEach((t) => au.assertNumericStringProperty(t, 'price'));

        trades.forEach((t) => {
          if (t.amount) {
            au.assertNumericStringProperty(t, 'amount');
            au.assertNumericStringProperty(t, 'amount_quote', { required: false });
          } else {
            au.assertNumericStringProperty(t, 'amount_quote');
            au.assertNumericStringProperty(t, 'amount', { required: false });
          }
        });

        trades.forEach(t => au.assertPropertyInSet(t, 'type', TRADE_TYPES, { required: false }))
        trades.forEach((t) => au.assertPropertyInSet(t, 'side', ['buy', 'sell'], { required: false }));
        trades.forEach((t) => au.assertStringProperty(t, 'order', { required: false }));

        const since = trades[0].id;
        const second = await au.get(`/trades?market=${encodeURIComponent(market.id)}&since=${since}`);

        au.assert(second.length > 0, `Trades with since=${since} didn't return any trades`);
        au.assert(
          !second.find(t => t.id === since),
          `Trades with since=${since} contained a trade with the same id as the since parameter. Only trades *after* the since id should be returned`
        )
        au.assert(
          second.find(t => t.id === trades[1].id),
          `Trades with since=${since} didn't contain an overlap with the first page. Expected to see trade with id ${trades[1].id}`
        )

        success = true
      } catch (err) {
        console.log(`FAILED: URL ${uri || err.stack} failed with "${err.message}"`)

        if (i === markets.length - 1) {
          throw err
        }
      }
    }
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

    let success = false
    let uri

    for (let i = 0; i < markets.length && !success; i++) {
      uri = null
      try {
        const market = markets[i]
        uri = `/trades-by-timestamp?market=${encodeURIComponent(market.id)}`
        const trades = await au.get(`/trades-by-timestamp?market=${encodeURIComponent(market.id)}`)

        au.assert(trades.length > 2, 'Expected more than two trades');
        
        au.assert(
          !trades.find(t => new Date(t.timestamp).getTime() < new Date('2006-01-01').getTime()),
          `Trades for market=${market.id} contained a trade with a timestamp before 2006.`
        )

        trades.forEach((t) => au.assertStringProperty(t, 'id'));
        trades.forEach((t) => au.assertTimestampProperty(t, 'timestamp'));
        trades.forEach((t) => au.assertNumericStringProperty(t, 'price'));

        trades.forEach((t) => {
          if (t.amount) {
            au.assertNumericStringProperty(t, 'amount');
            au.assertNumericStringProperty(t, 'amount_quote', { required: false });
          } else {
            au.assertNumericStringProperty(t, 'amount_quote');
            au.assertNumericStringProperty(t, 'amount', { required: false });
          }
        });

        trades.forEach((t) => au.assertStringProperty(t, 'order', { required: false }));
        trades.forEach(t => au.assertPropertyInSet(t, 'type', TRADE_TYPES, { required: false }))
        trades.forEach((t) => au.assertPropertyInSet(t, 'side', ['buy', 'sell'], { required: false }));

        const since = trades[0].timestamp
        const second = await au.get(
          `/trades-by-timestamp?market=${encodeURIComponent(market.id)}&since=${encodeURIComponent(since)}`
        )
        au.assert(second.length > 0, `Trades with since=${since} didn't return any trades`)
        au.assert(
          !second.find(t => t.timestamp < trades[0].timestamp),
          `Trades with since=${trades[0].timestamp} contained a trade with a timestamp before the since parameter. Only trades *after or equal to* the since id should be returned`
        )
        au.assert(
          second.find(t2 => t2.id === trades.find(t => t.timestamp > since).id),
          `Trades with since=${trades[0].timestamp} didn't contain an overlap with the first page. Expected to see trade with id ${trades[1].id}`
        )

        success = true
      } catch (err) {
        console.log(`FAILED: URL ${uri || err.stack} failed with "${err.message}"`)

        if (i === markets.length - 1) {
          throw err
        }
      }
    }
  },

  tradesSnapshot: async () => {
    if (!this.info.capability || !this.info.capability.markets || !this.info.capability.tradesSnapshot) {
      return
    }

    const markets = await au.get('/markets')
    if (markets.length === 0) {
      // If there are no markets, pass, since markets spec will fail
      return
    }

    let success = false
    let uri

    for (let i = 0; i < markets.length && !success; i++) {
      uri = null

      try {
        const market = markets[i]
        uri = `/trades/snapshot?market=${encodeURIComponent(market.id)}`
        const trades = await au.get(uri)

        au.assert(trades.length > 2, 'Expected more than two trades')

        trades.forEach(t => au.assertStringProperty(t, 'id'))
        trades.forEach(t => au.assertTimestampProperty(t, 'timestamp'))
        trades.forEach(t => au.assertPropertyInSet(t, 'type', TRADE_TYPES, { required: false }))
        trades.forEach(t => au.assertPropertyInSet(t, 'side', ['buy', 'sell'], { required: false }))
        trades.forEach((t) => au.assertNumericStringProperty(t, 'price'));

        trades.forEach((t) => {
          if (t.amount) {
            au.assertNumericStringProperty(t, 'amount');
            au.assertNumericStringProperty(t, 'amount_quote', { required: false });
          } else {
            au.assertNumericStringProperty(t, 'amount_quote');
            au.assertNumericStringProperty(t, 'amount', { required: false });
          }
        });

        trades.forEach((t) => au.assertStringProperty(t, 'order', { required: false }));

        success = true
      } catch (err) {
        console.log(`FAILED: URL ${uri || err.stack} failed with "${err.message}"`)

        throw err
      }
    }
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

    let success = false
    let uri

    for (let i = 0; i < markets.length && !success; i++) {
      uri = null
      try {
        const market = markets[i]
        uri = `/orders/snapshot?market=${encodeURIComponent(market.id)}`
        const orderBook = await au.get(`/orders/snapshot?market=${encodeURIComponent(market.id)}`)

        au.assertTimestampProperty(orderBook, 'timestamp')
        au.assertArrayProperty(orderBook, 'bids')
        au.assertArrayProperty(orderBook, 'asks')

        orderBook.bids.forEach(bid => {
          const bid0 = parseFloat(bid[0])
          const bid1 = parseFloat(bid[1])

          au.assert(
            typeof bid0 === 'number' && !isNaN(bid0),
            'Expect bid price to be of type number or numeric string'
          )
          au.assert(
            typeof bid1 === 'number' && !isNaN(bid1),
            'Expect bid amount to be of type number or numeric string'
          )
        })

        orderBook.asks.forEach(ask => {
          const ask0 = parseFloat(ask[0])
          const ask1 = parseFloat(ask[1])

          au.assert(
            typeof ask0 === 'number' && !isNaN(ask0),
            'Expect ask price to be of type number or numeric string'
          )
          au.assert(
            typeof ask1 === 'number' && !isNaN(ask1),
            'Expect ask amount to be of type number or numeric string'
          )
        })

        au.assert(
          typeof orderBook.bids[0] === typeof orderBook.asks[0],
          'Expect ask prices and bid prices to be of the same type'
        );

        const bidPrices = orderBook.bids.map(b => b[0])
        const bidPricesSorted = typeof orderBook.bids[0][0] === 'number'
          ? orderBook.bids.map(b => b[0]).sort((a, b) => b - a)
          : orderBook.bids.map(b => b[0]).sort((a, b) => b.localeCompare(a));
        au.assert(
          JSON.stringify(bidPrices) === JSON.stringify(bidPricesSorted),
          'Expected bids to be sorted by price descending'
        )

        const askPrices = orderBook.asks.map(b => b[0])
        const askPricesSorted = typeof orderBook.asks[0][0] === 'number'
          ? orderBook.asks.map(b => b[0]).sort((a, b) => a - b)
          : orderBook.asks.map(b => b[0]).sort((a, b) => a.localeCompare(b));
        au.assert(
          JSON.stringify(askPrices) === JSON.stringify(askPricesSorted),
          'Expected asks to be sorted by price ascending'
        )

        success = true
      } catch (err) {
        console.log(`FAILED: URL ${uri || err.stack} failed with "${err.message}"`)

        if (i === markets.length - 1) {
          throw err
        }
      }
    }
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
    let uri

    try {
      for (const interval of intervals) {
        uri = `/candles?market=${encodeURIComponent(market.id)}&interval=${interval}`

        const candles = await au.get(uri)

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

        candles.forEach(c => {
          au.assertNumericStringProperty(c, 'open')

          au.assertNumericStringProperty(c, 'high')
          au.assert(parseFloat(c.high) >= parseFloat(c.open), 'Expected high to be greater than or equal to open')
          au.assert(parseFloat(c.high) >= parseFloat(c.close), 'Expected high to be greater than or equal to close')
          au.assert(parseFloat(c.high) >= parseFloat(c.low), 'Expected high to be greater than or equal to low')

          au.assertNumericStringProperty(c, 'low')
          au.assert(parseFloat(c.low) > 0, 'Expected low to be greater than 0')
          au.assert(parseFloat(c.low) <= parseFloat(c.open), 'Expected low to be less than or equal to open')
          au.assert(parseFloat(c.low) <= parseFloat(c.close), 'Expected low to be less than or equal to close')
          au.assert(parseFloat(c.low) <= parseFloat(c.high), 'Expected low to be less than or equal to high')

          au.assertNumericStringProperty(c, 'close');

          if (c.volume) {
            au.assertNumericStringProperty(c, 'volume');
            au.assertNumericStringProperty(c, 'volume_quote', { required: false });
            au.assert(parseFloat(c.volume) >= 0, 'Expected volume to be greater than or equal to 0');
          } else {
            au.assertNumericStringProperty(c, 'volume_quote');
            au.assertNumericStringProperty(c, 'volume', { required: false });
            au.assert(parseFloat(c.volume_quote) >= 0, 'Expected volume to be greater than or equal to 0');
          }
        });
      }
    } catch (err) {
      console.log(`FAILED: URL ${uri || err.stack} failed with "${err.message}"`)

      throw err
    }
  },

  ticker: async () => {
    if (!this.info.capability || !this.info.capability.ticker) {
      return
    }

    au.assert(
      this.info.capability.ticker && this.info.capability.markets,
      'Expect markets capability if ticker capability is avaialable'
    )

    const markets = await au.get('/markets')
    if (markets.length === 0) {
      // If there are no markets, pass, since markets spec will fail
      return
    }

    let success = false
    let uri

    for (let i = 0; i < markets.length && !success; i++) {
      uri = null

      try {
        const market = markets[i]
        uri = `/ticker?market=${encodeURIComponent(market.id)}`
        const ticker = await au.get(`/ticker?market=${encodeURIComponent(market.id)}`)

        au.assert(ticker !== null, `Expected a ticker response for market ${market.id}`)

        au.assertNumericStringProperty(ticker, 'close', { required: true })
        au.assertNumericStringProperty(ticker, 'high', { required: false })
        au.assertNumericStringProperty(ticker, 'low', { required: false })
        au.assertProperty(ticker, 'raw', { required: true })
        au.assertTimestampProperty(ticker, 'timestamp', { required: true })

        if (ticker.volume) {
          au.assertNumericStringProperty(ticker, 'volume');
          au.assertNumericStringProperty(ticker, 'volume_quote', { required: false });
          au.assert(parseFloat(ticker.volume) >= 0, 'Expected volume to be greater than or equal to 0');
        } else {
          au.assertNumericStringProperty(ticker, 'volume_quote');
          au.assertNumericStringProperty(ticker, 'volume', { required: false });
          au.assert(parseFloat(ticker.volume_quote) >= 0, 'Expected volume to be greater than or equal to 0');
        }

        if (ticker.ask && ticker.bid) {
          au.assert(
            Number(ticker.bid) < Number(ticker.ask),
            `Expected ask (${ticker.ask}) to be greater than bid (${ticker.bid})`
          )
        }
        if (ticker.ask) {
          au.assertNumericStringProperty(ticker, 'ask', { required: false })
          au.assert(Number(ticker.ask) > 0, 'Expected ask to be greater than zero')
        }
        if (ticker.bid) {
          au.assertNumericStringProperty(ticker, 'bid', { required: false })
          au.assert(Number(ticker.bid) > 0, 'Expected bid to be greater than zero')
        }
        if (ticker.high) {
          au.assert(Number(ticker.high) > 0, `Expected high (${ticker.high}) to be greater than zero`)
          au.assert(
            Number(ticker.close) <= Number(ticker.high),
            `Expected close (${ticker.close}) to be less than or equal to high (${ticker.high})`
          )
        }
        if (ticker.low) {
          au.assert(Number(ticker.low) > 0, `Expected low (${ticker.low}) to be greater than zero`)
          au.assert(
            Number(ticker.close) >= Number(ticker.low),
            `Expected close (${ticker.close}) to be greater than or equal to low (${ticker.low})`
          )
        }
        if (ticker.high && ticker.low) {
          au.assert(
            Number(ticker.high) >= Number(ticker.low),
            `Expected high (${ticker.high}) to be higher than or equal to low (${ticker.low})`
          )
        }

        au.assert(Number(ticker.close) > 0, `Expected close (${ticker.close}) to be greater than zero`)

        success = true
      } catch (err) {
        console.log(`FAILED: URL ${uri || err.stack} failed with "${err.message}"`)

        if (i === markets.length - 1) {
          throw err
        }
      }
    }
  }
}
