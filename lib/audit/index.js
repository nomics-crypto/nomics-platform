const url = require('url')
const { spawn } = require('child_process')

module.exports = async function (options) {
  if (options.length !== 1) {
    return new Error('audit takes one argument: a url to and endpoint or a script file to run as an endpoint.')
  }
  const endpoint = options[0]

  const u = url.parse(endpoint)

  if (u.protocol) {
    return auditURL(endpoint)
  }

  return auditCommand(endpoint)
}

async function auditURL (u) {
  const results = []

  results.push(...await require('./info')(u))
  results.push(...await require('./market')(u))
  results.push(...await require('./trade')(u))

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

async function auditCommand (command) {
  const parts = command.split(' ')
  const child = spawn(parts[0], parts.slice(1))

  child.stdout.on('data', (data) => {
    console.log(`server: ${data}`)
  })

  child.stderr.on('data', (data) => {
    console.log(`server: ${data}`)
  })

  const closed = new Promise((resolve, reject) => {
    child.on('close', resolve)
  })

  const port = process.env.PORT || '3000'
  await auditURL(`http://localhost:${port}`)

  child.kill('SIGINT')
  await closed
}
