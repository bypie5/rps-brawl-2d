const CpuAgent = require('./cpuAgent')

function createCpuAgent(id, sessionId, msgHandlers) {
  return new CpuAgent(id, sessionId, msgHandlers)
}

module.exports = { createCpuAgent }
