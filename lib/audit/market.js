const Result = require('./result')
const axios = require('axios')

module.exports = async function (u) {
  const results = []
  try {
    const markets = (await axios.get(u + '/markets')).data
    results.push(new Result(true, true, '/markets is valid JSON'))
    results.push(...auditMarketData(markets))
  } catch (e) {
    results.push(new Result(false, true, '/markets failed or not JSON', e))
  }
  return results
}

function auditMarketData (markets) {
  const results = []

  if (markets.length < 1) {
    results.push(new Result(false, true, `/markets is empty`))
  } else {
    if (markets.some((m) => m.id.length < 1)) {
      results.push(new Result(false, true, '/markets has empty id records'))
    } else {
      results.push(new Result(true, true, '/markets entries all have ids'))
    }
    if (markets.some((m) => !m.base || m.base.length < 1)) {
      results.push(new Result(false, false, '/markets has empty base currencies'))
    } else {
      results.push(new Result(true, false, '/markets entries all have base currencies'))
    }
    if (markets.some((m) => !m.quote || m.quote.length < 1)) {
      results.push(new Result(false, false, '/markets has empty quote currencies'))
    } else {
      results.push(new Result(true, false, '/markets entries all have quote currencies'))
    }
    const idCounts = markets.reduce((memo, market) => {
      if (!memo[market.id]) {
        memo[market.id] = 0
      }
      memo[market.id]++
      return memo
    }, {})
    if (Object.values(idCounts).some((c) => c > 1)) {
      results.push(new Result(false, true, '/markets contains duplicate ids'))
    } else {
      results.push(new Result(true, true, '/markets has no duplicate ids'))
    }
  }

  return results
}
