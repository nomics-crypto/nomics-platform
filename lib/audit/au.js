const axios = require('axios')
const url = require('url')

const au = {
  Error: class {
    constructor (message, url = null) {
      this.name = 'AuditError'
      this.message = message
      this.stack = url
    }

    toString () {
      return this.message
    }
  },

  // testEndpoint takes a path to fetch and a test function. The test function will receive the fetched data
  // as its only argument (as a function accessor) and is expected to return a valid teenytest test object
  testEndpoint: function (path, tests) {
    return {
      beforeAll: async () => {
        this.url = process.env.NOMICS_PLATFORM_URL_ROOT + path
        try {
          this.data = (await axios.get(this.url)).data
        } catch (err) {
          this.dataError = err
        }
      },
      fetch: () => {
        if (!this.data) {
          throw new au.Error(this.dataError.toString(), this.url)
        }
      },
      [path]: au.withValue(() => this.data, tests(() => this.data))
    }
  },

  // withValue accepts a function to be executed at test runtime. If the function returns truthy, the tests
  // provided as the second argument will be run. If the function is falsy, the tests won't be run. This
  // helps us only fail once when a precondition fails without causing a lot of noise to the user.
  withValue: function (valueFn, tests) {
    return Object.keys(tests).reduce((memo, key) => {
      memo[key] = () => {
        if (valueFn.apply(this)) {
          tests[key]()
        }
      }
      return memo
    }, {})
  },

  assertProperty: function (o, p, opts = {}) {
    opts = Object.assign({required: true}, opts)
    if (!o.hasOwnProperty(p)) {
      if (!opts.required) {
        return false
      }
      throw new au.Error(`Expected '${p}' key: ${JSON.stringify(o)}`)
    }
    return true
  },

  assertPropertyType: function (o, p, t) {
    if (typeof o[p] !== t) {
      throw new au.Error(`Expected '${p}' to be a ${t}: ${JSON.stringify(o)}`)
    }
  },

  assertPropertyNotEmpty: function (o, p) {
    if (o[p].length === 0) {
      throw new au.Error(`Expected '${p}' not to be blank: ${JSON.stringify(o)}`)
    }
  },

  assertStringProperty: function (o, p, opts = {}) {
    if (this.assertProperty(o, p, opts)) {
      this.assertPropertyType(o, p, 'string')
      this.assertPropertyNotEmpty(o, p)
    }
  },

  assertURLProperty: function (o, p, opts = {}) {
    opts = Object.assign({required: true}, opts)
    if (this.assertProperty(o, p, opts)) {
      this.assertPropertyType(o, p, 'string')
      if (!url.parse(o[p]).protocol) {
        throw new au.Error(`Expected '${p}' to be a valid URL: ${JSON.stringify(o)}`)
      }
    }
  }
}

module.exports = au
