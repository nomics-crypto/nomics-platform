const express = require('express')

const MINUTE = 1000 * 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24

function Server () {
  const app = express()

  app.get('/', status)
  app.get('/info', info)
  app.get('/markets', markets)
  app.get('/trades', trades)
  app.get('/trades-by-timestamp', tradesByTimestamp)
  app.get('/orders/snapshot', ordersSnapshot)
  app.get('/candles', candles)

  return app
}

function status (_, res) {
  res.send('OK')
}

function info (_, res) {
  res.send({
    description: 'Example Exchange is an example of an exchange integration for Nomics.com',
    name: 'Example',
    twitter: 'nomicsfinance',
    website: 'https://nomics.com',
    capability: {
      markets: true,
      trades: true,
      tradesByTimestamp: true,
      tradesSocket: false,
      orders: false,
      ordersSocket: false,
      ordersSnapshot: true,
      candles: true
    }
  })
}

function markets (_, res) {
  res.send([
    {
      id: 'btc-usd',
      base: 'BTC',
      quote: 'USD'
    }
  ])
}

const allTrades = [
  {
    id: '1',
    timestamp: '2006-01-02T15:04:05.999+07:00',
    price: '100.00',
    amount: '10.00',
    order: '1',
    type: 'market',
    side: 'buy',
    raw: [1, 1136214245, 100.0, 10.0, '1', 'm', 'b']
  },
  {
    id: '2',
    timestamp: '2006-01-02T15:14:05.999+07:00',
    price: '98.00',
    amount: '1.00',
    order: '3',
    type: 'market',
    side: 'sell',
    raw: [2, 1136214255, 98.0, 1.0, '3', 'm', 's']
  },
  {
    id: '3',
    timestamp: '2006-01-02T15:24:05.999+07:00',
    price: '101.37',
    amount: '3.50',
    order: '5',
    type: 'limit',
    side: 'buy',
    raw: [3, 1136214265, 101.37, 3.5, '5', 'l', 'b']
  }
]

function trades (req, res) {
  if (req.query.market !== 'btc-usd') {
    res.status(404).send({ error: 'unknown market' })
    return
  }
  let since = parseInt(req.query.since)
  if (isNaN(since)) {
    since = 0
  }
  res.send(allTrades.filter(t => parseInt(t.id) > since))
}

function tradesByTimestamp (req, res) {
  if (req.query.market !== 'btc-usd') {
    res.status(404).send({ error: 'unknown market' })
    return
  }
  let since
  if (req.query.since) {
    since = new Date(req.query.since)
  } else {
    since = new Date(0)
  }
  res.send(allTrades.filter(t => new Date(t.timestamp).getTime() > since.getTime()))
}

function ordersSnapshot (req, res) {
  if (req.query.market !== 'btc-usd') {
    res.status(404).send({ error: 'unknown market' })
    return
  }
  res.send({
    bids: [[5000.0, 1.0], [4900.0, 10.0]],
    asks: [[5100.0, 5.0], [5150.0, 10.0]],
    timestamp: new Date()
  })
}

function candles (req, res) {
  const interval = req.query.interval

  if (req.query.market !== 'btc-usd') {
    res.status(404).send({ error: 'unknown market' })
    return
  }

  if (!['1d', '1h', '1m'].includes(interval)) {
    res.status(404).send({ error: 'unknown interval' })
    return
  }

  let count
  let dInterval
  let result = []

  if (interval === '1d') {
    count = 7
    dInterval = DAY
  } else if (interval === '1h') {
    count = 24
    dInterval = HOUR
  } else {
    count = 60
    dInterval = MINUTE
  }

  for (let i = 0; i < count; i++) {
    let now = Date.now()
    let timestamp = new Date(Math.floor((now - dInterval) / dInterval) * dInterval)

    result[i] = {
      timestamp,
      open: '4002.8',
      high: '4119.98',
      low: '3741.95',
      close: '4102.8',
      volume: '19040.84'
    }
  }

  res.send(result.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1)))
}

if (require.main === module) {
  const instance = Server().listen(process.env.PORT || '3000')
  process.on('SIGINT', () => instance.close())
  process.on('SIGTERM', () => instance.close())
}

module.exports = Server
