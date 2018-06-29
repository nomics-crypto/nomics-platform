const url = require('url')

module.exports = async function (options) {
  if (options.length !== 1) {
    return new Error('audit takes one argument: a url to and endpoint or a script file to run as an endpoint.')
  }
  const endpoint = options[0]

  const u = url.parse(endpoint)

  if (u.protocol) {
    return auditURL(endpoint)
  }

  return new Error(endpoint + ' not recognized as url')
}

async function auditURL (u) {
  const results = []

  results.push(...await require('./info')(u))
  results.push(...await require('./market')(u))

  console.log(results.map((r) => r.toString()).join('\n'))

  const anyRequiredFailures = results.some((r) => r.required && !r.pass)

  if (anyRequiredFailures) {
    return new Error('\x1B[31mAudit Failed: One or more required audits failed\x1B[0m')
  }

  const anyOptionalFailures = results.some((r) => !r.required && !r.pass)
  if (anyOptionalFailures) {
    console.log('\x1B[33mAudit Passed, but some optional audits failed\x1B[0m')
  } else {
    console.log('\x1B[32mAudit Passed\x1b[0m')
  }
}
