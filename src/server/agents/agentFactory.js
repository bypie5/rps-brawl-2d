const CpuAgent = require('./cpuAgent')
const NaivePursuit = require('./naivePursuit')

const supportedAgents = {
  cpuAgent: 'CpuAgent',
  naivePursuit: 'NaivePursuitAgent'
}

function createCpuAgent(id, sessionId, msgHandlers) {
  return new CpuAgent(id, sessionId, msgHandlers)
}

function createNaivePursuit(id, sessionId, msgHandlers) {
  return new NaivePursuit(id, sessionId, msgHandlers)
}

module.exports = { supportedAgents, createCpuAgent, createNaivePursuit }
