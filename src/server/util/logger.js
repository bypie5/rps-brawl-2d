class Logger {
  info(message) {
    console.log(`[INFO] ${new Date().toUTCString()} - ${message}`)
  }

  warn(message) {
    console.log(`[WARN] ${new Date().toUTCString()} - ${message}`)
  }

  error(message) {
    console.log(`[ERROR] ${new Date().toUTCString()} - ${message}`)
  }
}

module.exports = new Logger()
