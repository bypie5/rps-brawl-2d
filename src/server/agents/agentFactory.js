const CpuAgent = require('./cpuAgent')
const NaivePursuit = require('./naivePursuit')
const NaiveMatchTarget = require('./naiveMatchTarget')

const supportedAgents = {
  cpuAgent: 'CpuAgent',
  naivePursuit: 'NaivePursuitAgent',
  naiveMatchTarget: 'NaiveMatchTargetAgent',
}

function createCpuAgent(id, sessionId, msgHandlers) {
  return new CpuAgent(id, sessionId, msgHandlers)
}

function createNaivePursuit(id, sessionId, msgHandlers) {
  return new NaivePursuit(id, sessionId, msgHandlers)
}

function createNaiveMatchTarget(id, sessionId, msgHandlers) {
  return new NaiveMatchTarget(id, sessionId, msgHandlers)
}

module.exports = { supportedAgents, createCpuAgent, createNaivePursuit, createNaiveMatchTarget }
