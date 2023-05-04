const NaiveMatchTarget = require('./naiveMatchTarget')
const {
  Sequence,
  Condition,
  Action
} = require('./bt/behaviorTree')

class NaiveRandomBracket extends NaiveMatchTarget {
  constructor(botId, sessionId, msgHandlers) {
    super(botId, sessionId, msgHandlers)
  }

  buildBehaviorTree() {
    const ancestorTree = super.buildBehaviorTree()

    const context = {
      maxTicksUntilRandomize: 33,
      ticksUntilRandomize: 0,
    }

    const root = ancestorTree.findNodeById('naive-pursuit-root')

    const sequence = new Sequence('naive-random-bracket-sequence')

    const isInMidMatchTieBreaker = new Condition((context) => {
      const myAvatar = context.latestGameState.entities[this.selfEntityId]
      return myAvatar.Avatar.state === 'breakingtie'
    }, 'is-in-mid-match-tie-breaker')

    const randomizeRpsState = new Action(async (context) => {
      if (context.ticksUntilRandomize < context.maxTicksUntilRandomize) {
        context.ticksUntilRandomize++
        return
      }

      const rpsState = Math.floor(Math.random() * 3)
      if (rpsState === 0) {
        this.stateShiftLeft()
      } else if (rpsState === 1) {
        this.stateShiftRight()
      }

      context.ticksUntilRandomize = 0
    }, 'randomize-rps-state')

    sequence.addChild(isInMidMatchTieBreaker)
    sequence.addChild(randomizeRpsState)

    root.addChildAtIndex(sequence, 0)

    ancestorTree.setContextOfAllAncestors(ancestorTree.root, context)

    return ancestorTree
  }
}

module.exports = NaiveRandomBracket
