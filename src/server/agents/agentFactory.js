const CpuAgent = require('./cpuAgent')
const NaivePursuit = require('./naivePursuit')

function createCpuAgent(id, sessionId, msgHandlers, sessionContext) {
  return new CpuAgent(id, sessionId, msgHandlers, sessionContext)
}

function createNaivePursuit(id, sessionId, msgHandlers, sessionContext) {
  return new NaivePursuit(id, sessionId, msgHandlers, sessionContext)
}

module.exports = { createCpuAgent, createNaivePursuit }
