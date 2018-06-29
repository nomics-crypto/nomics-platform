var audit = require("./audit")
var init = require("./init")

class UsageError extends Error {}

module.exports = async function(argv) {
  var err = await run(argv)
  if (err) {
    console.log("\n"+err.toString()+"\n")
    if (err instanceof UsageError) {
      usage()
    }
    process.exit(1)
  }
}

async function run(argv) {
  if (argv.length < 1) {
    return new UsageError("Command is required")
  }
  var command = argv[0];
  var options = argv.slice(1);
  switch(command) {
    case "audit": return await audit(options)
    case "init": return init(options)
    default: return new UsageError("Unknown command: "+command)
  }
}

function usage() {
  console.log([
    "Usage: nomics-platform [command] [flags]",
    "Commands:",
    "\taudit [url or path to script]",
    "\tinit",
  ].join("\n\t"))
}