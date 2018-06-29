const https = require('https')
const http = require('http')

module.exports = function (u) {
  return new Promise((resolve, reject) => {
    const handler = (res) => {
      const { statusCode } = res
      const contentType = res.headers['content-type']

      if (statusCode !== 200) {
        reject(new Error('Request Failed.\n' + `Status Code: ${statusCode}`))
        res.resume()
        return
      } else if (!/^application\/json/.test(contentType)) {
        reject(new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`))
        res.resume()
        return
      }

      res.setEncoding('utf8')
      let rawData = ''
      res.on('data', (chunk) => { rawData += chunk })
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData)
          resolve(parsedData)
        } catch (e) {
          reject(e)
        }
      })
    }

    if (u.indexOf('https') === 0) {
      https.get(u, handler).on('error', (e) => { reject(e) })
    } else {
      http.get(u, handler).on('error', (e) => { reject(e) })
    }
  })
}
