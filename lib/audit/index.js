const url = require('url')
const { spawn } = require('child_process')
const net = require('net')
const teenytest = require('teenytest')

module.exports = async function (options) {
  if (options.length < 1) {
    console.log('audit requires at least one argument: a url to and endpoint or a script file to run as an endpoint.')
    process.exit(1)
  }
  const endpoint = options[0]

  const u = url.parse(endpoint)

  try {
    if (u.protocol) {
      await auditURL(endpoint)
    } else {
      await auditCommand(endpoint, options.slice(1))
    }
  } catch (err) {
    process.exit(1)
  }
}

function auditURL (u) {
  return new Promise((resolve, reject) => {
    process.chdir(__dirname)
    process.env.NOMICS_PLATFORM_URL_ROOT = u
    teenytest('test/*.js', {plugins: ['teenytest-promise']}, (err, passing) => {
      if (err || !passing) {
        reject(new Error('Audit Failed'))
      } else {
        resolve()
      }
    })
  })
}

function auditCommand (command, options) {
  const parts = command.split(' ')
  const child = spawn(parts[0], parts.slice(1))

  let path = ''
  if (options.length > 0) {
    path = options[0]
  }

  child.stdout.on('data', (data) => console.log(`server: ${data}`))
  child.stderr.on('data', (data) => console.log(`server: ${data}`))

  return new Promise(async (resolve, reject) => {
    child.on('error', reject)

    const port = process.env.PORT || '3000'
    const p = await ping()
    if (p instanceof Error) {
      reject(p)
    }

    let err
    try {
      err = await auditURL(`http://localhost:${port}${path}`)
    } catch (e) {
      err = e
    }

    await new Promise((resolve, reject) => {
      child.on('exit', resolve)
      child.kill()
    })

    if (err) {
      reject(err)
    } else {
      resolve()
    }
  })
}

async function ping (attempt = 0, sleepTime = 1000) {
  const port = process.env.PORT || '3000'

  try {
    await new Promise((resolve, reject) => {
      const s = net.createConnection({port}, resolve)
      s.on('error', reject)
    })
  } catch (e) {
    if (attempt < 3) {
      console.log(`Failed to connect to server on localhost:${port}, retry in ${sleepTime}ms`)
      await sleep(sleepTime)
      return ping(attempt + 1, sleepTime * 2)
    }
    return e
  }
}

async function sleep (time) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time)
  })
}
