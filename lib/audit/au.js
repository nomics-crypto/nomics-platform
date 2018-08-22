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
        if (typeof path === 'function') {
          path = path()
        }
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
      ...au.withValue(() => this.data, tests(() => this.data))
    }
  },

  // withValue accepts a function to be executed at test runtime. If the function returns truthy, the tests
  // provided as the second argument will be run. If the function is falsy, the tests won't be run. This
  // helps us only fail once when a precondition fails without causing a lot of noise to the user.
  withValue: function (valueFn, tests) {
    return Object.keys(tests).reduce((memo, key) => {
      if (typeof tests[key] === 'function') {
        memo[key] = () => {
          if (valueFn.apply(this)) {
            tests[key]()
          }
        }
      } else {
        memo[key] = tests[key]
      }
      return memo
    }, {})
  },

  assert: function (b, msg, url = this.url) {
    if (!b) {
      throw new au.Error(msg, url)
    }
  },

  assertProperty: function (o, p, opts = {}) {
    opts = Object.assign({required: true}, opts)
    if (!o.hasOwnProperty(p)) {
      if (!opts.required) {
        return false
      }
      throw new au.Error(`Expected '${p}' key: ${JSON.stringify(o)}`, this.url)
    }
    return true
  },

  assertPropertyType: function (o, p, t) {
    au.assert(typeof o[p] === t, `Expected '${p}' to be a ${t}: ${JSON.stringify(o)}`)
  },

  assertPropertyNotEmpty: function (o, p) {
    au.assert(o[p].length > 0, `Expected '${p}' not to be blank: ${JSON.stringify(o)}`)
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
      au.assert(url.parse(o[p]).protocol, `Expected '${p}' to be a valid URL: ${JSON.stringify(o)}`)
    }
  },

  assertTimestampProperty: function (o, p, opts = {}) {
    opts = Object.assign({required: true}, opts)
    if (this.assertProperty(o, p, opts)) {
      this.assertPropertyType(o, p, 'string')
      let valid = false
      let err = ''
      const d = new Date(o[p])
      try {
        valid = d.toISOString() === o[p]
      } catch (e) {
        err = e.toString() + ' '
      }
      au.assert(valid, `Expected '${p}' to be a valid RFC3339 Timestamp: ${err}${JSON.stringify(o)}`)
    }
  },

  assertNumericStringProperty: function (o, p, opts = {}) {
    opts = Object.assign({required: true}, opts)
    au.assertStringProperty(o, p, opts)
    const n = parseFloat(o[p])
    au.assert(typeof n === 'number' && !isNaN(n), `Expected '${p}' to be a numeric string: ${JSON.stringify(o)}`)
  },

  assertPropertyInSet: function (o, p, s, opts = {}) {
    opts = Object.assign({required: true}, opts)
    if (au.assertProperty(o, p, opts)) {
      au.assert(s.indexOf(o[p]) > -1, `Expected '${p}' to be one of '${JSON.stringify(s)}': ${JSON.stringify(o)}`)
    }
  }
}

module.exports = au
