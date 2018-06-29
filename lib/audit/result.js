class Result {
  constructor(pass, required, message, error = null) {
    this.pass = pass;
    this.message = message;
    this.required = required;
    this.error = error;
  }

  toString() {
    return [
      this.pass ? "[✔]" : "[x]",
      this.required ? "* " : " ",
      this.message,
      this.error ? "\n"+this.error.toString() : "",
    ].join("")
  }
}

module.exports = Result;
