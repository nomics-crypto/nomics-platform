const au = require('../au')

module.exports = {
  info: async () => {
    const data = await au.get('/info')

    au.assertStringProperty(data, 'name')
    au.assertStringProperty(data, 'description', {required: false})
    au.assertURLProperty(data, 'logo', {required: false})
    au.assertURLProperty(data, 'website', {required: false})
    au.assertStringProperty(data, 'twitter', {required: false})
  }
}
