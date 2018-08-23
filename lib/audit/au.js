const axios = require('axios')
const url = require('url')

const au = {
  // Error is an error that shows the url when available instead of a stack trace
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

  // get performs a get request and returns the data (or throws an error on failure). It also sets
  // `this.url` to the full URL fetched so that assertions can use it for error messages.
  get: async function (path) {
    this.url = process.env.NOMICS_PLATFORM_URL_ROOT + path
    try {
      return (await axios.get(this.url)).data
    } catch (err) {
      throw new au.Error(err.toString(), this.url)
    }
  },

  // assert is like node's assert but it throws an audit error with a url instead of a stack trace
  assert: function (b, msg, url = this.url) {
    if (!b) {
      throw new au.Error(msg, url)
    }
  },

  // assertProperty asserts that the given object `o` contains the given key `p`. `opts` can be provided with key
  // `required` to indicate that it shouldn't fail if the property isn't present. It returns true if the property
  // was present and false if it was not found. It can be used in coordination with other property assertions to
  // only validate a property when present, e.g.:
  //   if (assertProperty(obj, "hello", {required: false})) {
  //     assertStringProperty(obj, "hello")
  //   }
  // This says "hello must be a string if present"
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

  // assertPropertyType asserts that property `p` on object `o` is of type `t`
  assertPropertyType: function (o, p, t) {
    au.assert(typeof o[p] === t, `Expected '${p}' to be a ${t}: ${JSON.stringify(o)}`)
  },

  // assertPropertyNotEmpty asserts that property `p` of object `o` has positive length
  assertPropertyNotEmpty: function (o, p) {
    au.assert(o[p].length > 0, `Expected '${p}' not to be blank: ${JSON.stringify(o)}`)
  },

  // assertStringProperty asserts that property `p` of object `o` is a non empty string if required
  assertStringProperty: function (o, p, opts = {}) {
    if (this.assertProperty(o, p, opts)) {
      this.assertPropertyType(o, p, 'string')
      this.assertPropertyNotEmpty(o, p)
    }
  },

  // assertURLProperty asserts that property `p` of object `o` is a valid URL
  assertURLProperty: function (o, p, opts = {}) {
    opts = Object.assign({required: true}, opts)
    if (this.assertProperty(o, p, opts)) {
      this.assertPropertyType(o, p, 'string')
      au.assert(url.parse(o[p]).protocol, `Expected '${p}' to be a valid URL: ${JSON.stringify(o)}`)
    }
  },

  // assertTimestampProperty asserts that property `p` of object `o` is a valid RFC3339 timestamp
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

  // assertNumericStringProperty asserts that property `p` of object `o` is a string that is parseable to a number
  assertNumericStringProperty: function (o, p, opts = {}) {
    opts = Object.assign({required: true}, opts)
    if (this.assertProperty(o, p, opts)) {
      au.assertStringProperty(o, p, opts)
      const n = parseFloat(o[p])
      au.assert(typeof n === 'number' && !isNaN(n), `Expected '${p}' to be a numeric string: ${JSON.stringify(o)}`)
    }
  },

  // assertPropertyInSet asserts that property `p` of object `o` is a value in the array `s`
  assertPropertyInSet: function (o, p, s, opts = {}) {
    opts = Object.assign({required: true}, opts)
    if (au.assertProperty(o, p, opts)) {
      au.assert(s.indexOf(o[p]) > -1, `Expected '${p}' to be one of '${JSON.stringify(s)}': ${JSON.stringify(o)}`)
    }
  }
}

module.exports = au
