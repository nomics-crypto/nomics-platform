const audit = require('./lib/audit')
const Server = require('./example');

(async function test() {
  const port = process.env.PORT || '3000'
  const instance = Server().listen(port)
  await audit([`http://localhost:${port}`])
  instance.close()
})()
