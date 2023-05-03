const NaiveMatchTarget = require('./naiveMatchTarget')

class NaiveRandomBracket extends NaiveMatchTarget {
  constructor(botId, sessionId, msgHandlers) {
    super(botId, sessionId, msgHandlers)
  }

  buildBehaviorTree() {
    const ancestorTree = super.buildBehaviorTree()

    return ancestorTree
  }
}

module.exports = NaiveRandomBracket
