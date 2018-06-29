class Result {
  constructor (pass, required, message, error = null) {
    this.pass = pass
    this.message = message
    this.required = required
    this.error = error
  }

  // red: 31m
  // green: 32m
  // yellow: 33m
  // reset: 0m
  toString () {
    const color = '\x1B' + (this.pass ? '[32m' : (this.required ? '[31m' : '[33m'))
    return [
      color,
      this.pass ? '✔ ' : 'X ',
      this.message,
      this.error ? '\n' + this.error.toString() : '',
      '\x1B[0m'
    ].join('')
  }
}

module.exports = Result
