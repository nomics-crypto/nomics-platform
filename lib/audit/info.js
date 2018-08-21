const Result = require('./result')
const axios = require('axios')
const url = require('url')

module.exports = async function (u) {
  const results = []
  try {
    const info = (await axios.get(u + '/info')).data
    results.push(new Result(true, true, '/info is valid JSON'))
    results.push(...auditInfoData(info))
  } catch (e) {
    results.push(new Result(false, true, '/info failed or not JSON', e))
  }
  return results
}

function auditInfoData (info) {
  const results = []

  results.push(validateStringProperty(info, 'name', true, '/info'))
  results.push(validateStringProperty(info, 'description', false, '/info'))
  results.push(validateStringProperty(info, 'logo', false, '/info'))
  results.push(validateURLProperty(info, 'logo', false, '/info'))
  results.push(validateStringProperty(info, 'website', false, '/info'))
  results.push(validateURLProperty(info, 'website', false, '/info'))
  results.push(validateStringProperty(info, 'twitter', false, '/info'))

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
