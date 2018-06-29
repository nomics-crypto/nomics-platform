const get = require("./get")
const Result = require("./result")

module.exports = async function(u) {
  const results = [];
  try {
    const info = await get(u+"/info");
    results.push(new Result(true, true, "Fetched /info and parsed as JSON"))
    results.push(...auditInfoData(info))
  } catch(e) {
    results.push(new Result(false, true, "Failed to fetch /info and parse as JSON", e))
  }
  return results;
}

function auditInfoData(info) {
  const results = [];
  if (!info.hasOwnProperty("name") || typeof info.name !== "string" || info.name.length < 1) {
    results.push(new Result(false, true, "Info must contain `name`"))
  } else {
    results.push(new Result(true, true, "Info has valid `name`"))
  }
  return results
}
