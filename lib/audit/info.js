const get = require('./get')
const Result = require('./result')
const url = require('url')

module.exports = async function (u) {
  const results = []
  try {
    const info = await get(u + '/info')
    results.push(new Result(true, true, 'Fetched /info and parsed as JSON'))
    results.push(...auditInfoData(info))
  } catch (e) {
    results.push(new Result(false, true, 'Failed to fetch /info and parse as JSON', e))
  }
  return results
}

function auditInfoData (info) {
  const results = []

  results.push(validateStringProperty(info, 'name', true, 'Info'))
  results.push(validateStringProperty(info, 'description', false, 'Info'))
  results.push(validateStringProperty(info, 'logo', false, 'Info'))
  results.push(validateURLProperty(info, 'logo', false, 'Info'))
  results.push(validateStringProperty(info, 'website', false, 'Info'))
  results.push(validateURLProperty(info, 'website', false, 'Info'))
  results.push(validateStringProperty(info, 'twitter', false, 'Info'))

  return results
}

function validateStringProperty (data, name, required, prefix) {
  if (hasStringProperty(data, name)) {
    return new Result(true, required, `${prefix} has ${name}`)
  } else {
    return new Result(false, required, `${prefix} does not have ${name}`)
  }
}

function validateURLProperty (data, name, required, prefix) {
  if (hasStringProperty(data, name) && isURL(data[name])) {
    return new Result(true, required, `${prefix} ${name} is a valid url`)
  } else {
    return new Result(false, required, `${prefix} ${name} is not a valid url`)
  }
}

function hasStringProperty (data, name) {
  return data.hasOwnProperty(name) && typeof data[name] === 'string' && data[name].length > 0
}

function isURL (value) {
  return url.parse(value).protocol
}
