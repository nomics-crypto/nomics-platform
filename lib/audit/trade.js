const Result = require('./result')
const axios = require('axios')
const validTypes = ['market', 'limit', 'ask', 'bid']
const validSides = ['buy', 'sell']
const validKeys = ['id', 'timestamp', 'price', 'amount', 'order', 'type', 'side', 'raw']

module.exports = async function (u) {
  const results = []
  let markets = []
  try {
    markets = (await axios.get(u + '/markets')).data
  } catch (e) {
    return results
  }
  if (markets.length > 0) {
    results.push(...await auditTradeData(u, markets[0]))
  }
  return results
}

async function auditTradeData (u, market) {
  const results = []

  const path = `/trades?market=${encodeURIComponent(market.id)}`
  let trades = []
  try {
    trades = (await axios.get(u + path)).data
  } catch (e) {
    results.push(new Result(false, true, `${path} failed or not JSON`, e))
    return results
  }

  results.push(new Result(true, true, `${path} is valid JSON`))
  if (trades.length < 2) {
    results.push(new Result(false, true, `${path} didn't return enough trades to audit. Got: ${trades.length}`))
  } else {
    results.push(...validateTrades(path, trades))
  }

  const since = trades[0]
  const next = trades[1]
  const nextPath = path + `&since=${encodeURIComponent(since.id)}`
  try {
    trades = (await axios.get(u + nextPath)).data
  } catch (e) {
    results.push(new Result(false, true, `${nextPath} failed or not JSON`, e))
    return results
  }
  results.push(new Result(true, true, `${nextPath} is valid JSON`))
  results.push(...validateTrades(nextPath, trades))

  if (trades.find((t) => t.id === since.id)) {
    results.push(new Result(false, true, `${nextPath} contained since trade with id ${since.id}`))
  } else {
    results.push(new Result(true, true, `${nextPath} continued after since trade with id ${since.id}`))
  }

  if (!trades.find((t) => t.id === next.id)) {
    results.push(new Result(false, true, `${nextPath} didn't contain an expected overlap trade with id ${next.id}`))
  } else {
    results.push(new Result(true, true, `${nextPath} contained overlap trade with id ${next.id}`))
  }

  return results
}

function validateTrades (path, trades) {
  const results = []

  const tradeWithBadID = trades.find((t) => typeof t.id !== 'string' || t.id.length < 1)
  if (tradeWithBadID) {
    results.push(new Result(false, true, `${path} trade has invalid id: ${JSON.stringify(tradeWithBadID)}`))
  } else {
    results.push(new Result(true, true, `${path} trades have good ids`))
  }

  const tradeWithBadTimestamp = trades.find((t) => {
    if (typeof t.timestamp !== 'string') {
      return true
    }
    const d = new Date(t.timestamp)
    try {
      if (d.toISOString() !== t.timestamp) {
        return true
      }
    } catch (err) {
      return true
    }
    return false
  })
  if (tradeWithBadTimestamp) {
    results.push(new Result(false, true, `${path} trade has invalid RFC3339 timestamp: ${JSON.stringify(tradeWithBadTimestamp)}`))
  } else {
    results.push(new Result(true, true, `${path} trades have valid timestamps`))
  }

  const tradeWithBadPrice = trades.find((t) => {
    if (typeof t.price !== 'string') {
      return true
    }
    const p = parseFloat(t.price)
    return (typeof p !== 'number' || isNaN(p))
  })
  if (tradeWithBadPrice) {
    results.push(new Result(false, true, `${path} trade has bad price: ${JSON.stringify(tradeWithBadPrice)}`))
  } else {
    results.push(new Result(true, true, `${path} trades have valid prices`))
  }

  const tradeWithBadAmount = trades.find((t) => {
    if (typeof t.amount !== 'string') {
      return true
    }
    const p = parseFloat(t.amount)
    return (typeof p !== 'number' || isNaN(p))
  })
  if (tradeWithBadAmount) {
    results.push(new Result(false, true, `${path} trade has bad amount: ${JSON.stringify(tradeWithBadAmount)}`))
  } else {
    results.push(new Result(true, true, `${path} trades have valid amounts`))
  }

  const tradeWithBadOrder = trades.find((t) => {
    if (t.hasOwnProperty('order') && typeof t.order !== 'string') {
      return true
    }
  })
  if (tradeWithBadOrder) {
    results.push(new Result(false, true, `${path} trade has bad order: ${JSON.stringify(tradeWithBadOrder)}`))
  } else {
    results.push(new Result(true, true, `${path} trades have valid order or no order`))
  }

  const tradeWithBadType = trades.find((t) => {
    if (t.hasOwnProperty('type') && (typeof t.type !== 'string' || validTypes.indexOf(t.type) === -1)) {
      return true
    }
  })
  if (tradeWithBadType) {
    results.push(new Result(false, true, `${path} trade has bad type: ${JSON.stringify(tradeWithBadType)}`))
  } else {
    results.push(new Result(true, true, `${path} trades have valid type or no type`))
  }

  const tradeWithBadSide = trades.find((t) => {
    if (t.hasOwnProperty('side') && (typeof t.side !== 'string' || validSides.indexOf(t.side) === -1)) {
      return true
    }
  })
  if (tradeWithBadSide) {
    results.push(new Result(false, true, `${path} trade has bad side: ${JSON.stringify(tradeWithBadSide)}`))
  } else {
    results.push(new Result(true, true, `${path} trades have valid side or no side`))
  }

  const tradeWithBadKey = trades.find((t) => Object.keys(t).some((k) => validKeys.indexOf(k) === -1))
  if (tradeWithBadKey) {
    results.push(new Result(false, true, `${path} trade has unknown property: ${JSON.stringify(tradeWithBadKey)}`))
  } else {
    results.push(new Result(true, true, `${path} trades have valid properties`))
  }

  return results
}
