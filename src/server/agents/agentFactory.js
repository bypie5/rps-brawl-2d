const CpuAgent = require('./cpuAgent')

function createCpuAgent(id, sessionId) {
  return new CpuAgent(id, sessionId)
}

module.exports = { createCpuAgent }
