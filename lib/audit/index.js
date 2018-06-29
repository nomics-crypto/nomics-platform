const url = require("url")
const fs = require("fs")

module.exports = async function(options) {
  if (options.length !== 1) {
    return new Error("audit takes one argument: a url to and endpoint or a script file to run as an endpoint.")
  }
  const endpoint = options[0]

  const u = url.parse(endpoint)

  if (u.protocol) {
    return await auditURL(endpoint)
  }

  if (!fs.existsSync(endpoint)) {
    return new Error(endpoint+" not recognized as url and file does not exist")
  }

  return auditFile(endpoint)
}

async function auditURL(u) {
  const results = []
  results.push(...await require("./info")(u))

  console.log(results.map((r) => r.toString()).join("\n"))

  const anyRequiredFailures = results.some((r) => r.required && !r.pass);

  if (anyRequiredFailures) {
    return new Error("Audit Failed: One or more required audits failed")
  }

  const anyOptionalFailures = results.some((r) => !r.required && !r.pass);
  if (anyOptionalFailures) {
    console.log("Audit Passed, but some optional audits failed")
  } else {
    console.log("Audit Passed")
  }
}

function auditFile(path) {
  return new Error("auditing by script file is not yet implemented")
}
