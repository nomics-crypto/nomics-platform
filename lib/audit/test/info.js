const au = require('../au')

module.exports = au.testEndpoint('/info', (data) => ({
  name: function () { au.assertStringProperty(data(), 'name') },
  description: function () { au.assertStringProperty(data(), 'description', {required: false}) },
  logo: function () { au.assertURLProperty(data(), 'logo', {required: false}) },
  website: function () { au.assertURLProperty(data(), 'website', {required: false}) },
  twitter: function () { au.assertStringProperty(data(), 'twitter', {required: false}) }
}))
