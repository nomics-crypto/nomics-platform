const au = require('../au')

module.exports = au.testEndpoint('/markets', (markets) => au.withValue(() => markets()[0], {
  firstPage: au.testEndpoint(() => `/trades?market=${encodeURIComponent(markets()[0].id)}`, (firstPage) => ({
    atLeastTwo: function () { au.assert(firstPage().length > 2, 'Expected more than two trades') },
    id: function () { firstPage().forEach((t) => au.assertStringProperty(t, 'id')) },
    timestamp: function () { firstPage().forEach((t) => au.assertTimestampProperty(t, 'timestamp')) },
    price: function () { firstPage().forEach((t) => au.assertNumericStringProperty(t, 'price')) },
    amount: function () { firstPage().forEach((t) => au.assertNumericStringProperty(t, 'amount')) },
    order: function () { firstPage().forEach((t) => au.assertStringProperty(t, 'order', {required: false})) },
    type: function () { firstPage().forEach((t) => au.assertPropertyInSet(t, 'type', ['market', 'limit', 'ask', 'bid'], {required: false})) },
    side: function () { firstPage().forEach((t) => au.assertPropertyInSet(t, 'side', ['buy', 'sell'], {required: false})) }
  }))
}))
