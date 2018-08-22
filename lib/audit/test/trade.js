const au = require('../au')

function tradeTests (trades) {
  return {
    atLeastTwo: function () { au.assert(trades().length > 2, 'Expected more than two trades') },
    id: function () { trades().forEach((t) => au.assertStringProperty(t, 'id')) },
    timestamp: function () { trades().forEach((t) => au.assertTimestampProperty(t, 'timestamp')) },
    price: function () { trades().forEach((t) => au.assertNumericStringProperty(t, 'price')) },
    amount: function () { trades().forEach((t) => au.assertNumericStringProperty(t, 'amount')) },
    order: function () { trades().forEach((t) => au.assertStringProperty(t, 'order', {required: false})) },
    type: function () { trades().forEach((t) => au.assertPropertyInSet(t, 'type', ['market', 'limit', 'ask', 'bid'], {required: false})) },
    side: function () { trades().forEach((t) => au.assertPropertyInSet(t, 'side', ['buy', 'sell'], {required: false})) }
  }
}

module.exports = au.testEndpoint('/markets', (markets) => au.withValue(() => markets()[0], {
  first: au.testEndpoint(() => `/trades?market=${encodeURIComponent(markets()[0].id)}`, (trades) => ({
    ...tradeTests(trades),

    second: au.testEndpoint(() => `/trades?market=${encodeURIComponent(markets()[0].id)}&since=${trades()[0].id}`, (second) => ({
      ...tradeTests(second),

      pageAfterSince: function () {
        au.assert(!second().find((t) => t.id === trades()[0].id), `Trades with since=${trades()[0].id} contained the since trade`)
      },

      overlap: function () {
        au.assert(second().find((t) => t.id === trades()[1].id), `Trades with since=${trades()[0].id} didn't contain an overlap with the first page`)
      }
    }))
  }))
}))
