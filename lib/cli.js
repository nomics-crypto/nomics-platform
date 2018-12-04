var audit = require('./audit')

module.exports = function (argv) {
  if (argv.length < 1) {
    usage()
    process.exit(1)
  }

  var command = argv[0]
  var options = argv.slice(1)

  switch (command) {
    case 'audit': return audit(options)
    default:
      usage()
      process.exit(1)
  }
}

function usage () {
  console.log([
    'Usage: nomics-platform [command] [flags]',
    'Commands:',
    '\taudit url'
  ].join('\n\t'))
}
