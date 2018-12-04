const teenytest = require('teenytest')

module.exports = async function (options) {
  if (options.length < 1) {
    console.log('audit requires one argument: a url to and endpoint to audit.')
    process.exit(1)
  }
  try {
    await auditURL(options[0])
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
}

function auditURL (u) {
  return new Promise((resolve, reject) => {
    process.chdir(__dirname)
    process.env.NOMICS_PLATFORM_URL_ROOT = u
    teenytest('test/*.js', { plugins: ['teenytest-promise'] }, (err, passing) => {
      if (err || !passing) {
        reject(new Error('Audit Failed'))
      } else {
        resolve()
      }
    })
  })
}
