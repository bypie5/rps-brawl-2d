const {
  BehaviorTree,
  Sequence,
  Fallback,
  Decorator,
  Action,
  Condition
} = require("./bt/behaviorTree")
const { nodeStatus } = require("./bt/enums")

const CpuAgent = require("./cpuAgent")
const {
  computeGridKey,
  getEntitiesInBox,
  getNearestEntityByGridKey,
  computePathToTarget
} = require("./util");

class PathFindingPursuit extends CpuAgent {
  constructor(botId, sessionId, msgHandlers, navGrid) {
    super(botId, sessionId, msgHandlers)

    this.navGrid = navGrid

    this.setBehaviorTree(this.buildBehaviorTree())
  }

  /**
   * The agent should take the following actions with the following priorities:
   *
   * 1. If a player is near, move towards the player
   * 2. If there is a powerup near and the agent is not holding a powerup, move towards the powerup
   * 3. Pick a point on the map and move towards it
   *
   * @override
   */
  buildBehaviorTree() {
    const context = {
      target: null,
      latestGameState: null,
    }

    const tree = new BehaviorTree(context, () => {
      // init context with latest game state
      const latest = this.gameStateBroadcastsQueue.pop()
      if (latest) {
        context.latestGameState = latest.msg
      }
    })

    const root = new Fallback('path-finding-pursuit-root')

    const chasePlayerSequence = new Sequence('chase-player-sequence')

    const isPlayerNear = new Condition((context) => {
      const windowWidth = 10
      const windowHeight = 10

      const myAvatar = context.latestGameState.entities[this.selfEntityId]
      const currGridKey = computeGridKey(myAvatar.Transform.xPos, myAvatar.Transform.yPos, context.latestGameState.gridWidth)
      const playerEntitiesInScene = Object.entries(context.latestGameState.entities)
        .filter(([id, entity]) => {
          return !!entity.Avatar
            && !entity.Avatar.playerId.includes(this.botId)
            && entity.Avatar.state === 'alive'
        })

      const perceivedEntities = getEntitiesInBox(
        playerEntitiesInScene,
        windowWidth,
        windowHeight,
        currGridKey,
        context.latestGameState.gridWidth
      )

      const nearestEntity = getNearestEntityByGridKey(
        perceivedEntities,
        currGridKey,
        context.latestGameState.gridWidth
      )

      if (nearestEntity) {
        context.target = nearestEntity[0] // [0] is the entity id
      }

      return context.target !== null
    }, 'is-player-near')

    const canFindPathToPlayer = new Condition((context) => {
    })

    chasePlayerSequence.addChild(isPlayerNear)

    root.addChild(chasePlayerSequence)

    tree.setRoot(root)

    return tree
  }
}

module.exports = PathFindingPursuit
