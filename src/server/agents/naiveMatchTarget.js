const {
  Fallback,
  Action,
  Condition
} = require('./bt/behaviorTree')
const NaivePursuit = require('./naivePursuit')
const { rpsCompare } = require('../ecs/util')

class NaiveMatchTarget extends NaivePursuit {
  constructor(botId, sessionId, msgHandlers) {
    super(botId, sessionId, msgHandlers)
  }

  buildBehaviorTree() {
    const ancestorTree = super.buildBehaviorTree()

    const context = {
      myRpsState: null,
      targetRpsState: null,
    }

    const pursuitSequence = ancestorTree.findNodeById('pursuit-sequence')

    const matchTarget = new Fallback('match-target')

    const isMatchingTargetRpsState = new Condition((context) => {
      const myAvatar = context.latestGameState.entities[this.selfEntityId]
      const targetAvatar = context.latestGameState.entities[context.target]

      const myRpsState = myAvatar.Avatar.stateData.rockPaperScissors
      const targetRpsState = targetAvatar.Avatar.stateData.rockPaperScissors
      context.myRpsState = myRpsState
      context.targetRpsState = targetRpsState

      return rpsCompare(myRpsState, targetRpsState) === 0
    }, 'is-matching-target-rps-state')

    const matchRpsStateOfTarget = new Action(async (context) => {
      const comp = rpsCompare(context.myRpsState, context.targetRpsState)
      if (comp === 1) {
        this.stateShiftLeft()
      } else if (comp === -1) {
        this.stateShiftRight()
      }
    }, 'match-rps-state-of-target')

    matchTarget.addChild(isMatchingTargetRpsState)
    matchTarget.addChild(matchRpsStateOfTarget)

    pursuitSequence.addChild(matchTarget)

    ancestorTree.setContextOfAllAncestors(ancestorTree.root, context)

    return ancestorTree
  }
}

module.exports = NaiveMatchTarget
