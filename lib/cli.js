var audit = require("./audit")
var init = require("./init")

module.exports = function(argv) {
  if (argv.length < 1) {
    usage()
    process.exit(1)
  }
  var command = argv[0];
  var options = argv.slice(1);
  switch(command) {
    case "audit":
      audit(options);
      break;
    case "init":
      init(options);
      break;
    default:
      usage();
      process.exit(1);
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
