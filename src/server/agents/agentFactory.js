const CpuAgent = require('./cpuAgent')
const NaivePursuit = require('./naivePursuit')
const NaiveMatchTarget = require('./naiveMatchTarget')
const NaiveRandomBracket = require('./randomBracket')
const PathFindingPursuit = require('./pathFindingPursuit')

const supportedAgents = {
  cpuAgent: 'CpuAgent',
  naivePursuit: 'NaivePursuitAgent',
  naiveMatchTarget: 'NaiveMatchTargetAgent',
  naiveRandomBracket: 'NaiveRandomBracketAgent',
  pathFindingPursuit: 'PathFindingPursuitAgent',
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

function createNaiveRandomBracket(id, sessionId, msgHandlers) {
  return new NaiveRandomBracket(id, sessionId, msgHandlers)
}

function createPathFindingPursuit(id, sessionId, msgHandlers, navGrid) {
    return new PathFindingPursuit(id, sessionId, msgHandlers, navGrid)
}

module.exports = {
  supportedAgents,
  createCpuAgent,
  createNaivePursuit,
  createNaiveMatchTarget,
  createNaiveRandomBracket,
  createPathFindingPursuit
}
