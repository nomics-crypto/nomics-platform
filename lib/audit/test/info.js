const au = require('../au')

module.exports = {
  info: async () => {
    const data = await au.get('/info')

    au.assertStringProperty(data, 'name')
    au.assertStringProperty(data, 'description', {required: false})
    au.assertURLProperty(data, 'logo', {required: false})
    au.assertURLProperty(data, 'website', {required: false})
    au.assertStringProperty(data, 'twitter', {required: false})
    if (au.assertProperty(data, 'capability', {required: false})) {
      au.assertPropertyType(data, 'capability', 'object')
      const capability = data.capability
      au.assertBooleanProperty(capability, 'markets', {required: false})
      au.assertBooleanProperty(capability, 'trades', {required: false})
      au.assertBooleanProperty(capability, 'tradesSocket', {required: false})
      au.assertBooleanProperty(capability, 'orders', {required: false})
      au.assertBooleanProperty(capability, 'ordersSocket', {required: false})
      au.assertBooleanProperty(capability, 'ordersSnapshot', {required: false})
      au.assertBooleanProperty(capability, 'candles', {required: false})
    }
  }
}
