var audit = require('./audit')

class UsageError extends Error {}

module.exports = async function (argv) {
  var err = await run(argv)
  if (err) {
    console.log('\n' + err.toString() + '\n')
    if (err instanceof UsageError) {
      usage()
    }
    process.exit(1)
  }
}

async function run (argv) {
  if (argv.length < 1) {
    return new UsageError('Command is required')
  }
  var command = argv[0]
  var options = argv.slice(1)
  switch (command) {
    case 'audit': return audit(options)
    default: return new UsageError('Unknown command: ' + command)
  }
}

function usage () {
  console.log([
    'Usage: nomics-platform [command] [flags]',
    'Commands:',
    '\taudit [url] [path-to-root]'
  ].join('\n\t'))
}
