const au = require('../au')

module.exports = au.testEndpoint('/info', (data) => ({
  hasName: function () { au.assertStringProperty(data(), 'name') },
  hasDescription: function () { au.assertStringProperty(data(), 'description', {required: false}) },
  hasLogo: function () { au.assertURLProperty(data(), 'logo', {required: false}) },
  hasWebsite: function () { au.assertURLProperty(data(), 'website', {required: false}) },
  hasTwitter: function () { au.assertStringProperty(data(), 'twitter', {required: false}) }
}))
