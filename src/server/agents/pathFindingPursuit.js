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
  computePathToTarget,
  buildNavGridKey
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
      path: null,
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
      const windowWidth = 6 * context.latestGameState.gridWidth
      const windowHeight = 6 * context.latestGameState.gridWidth

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
      const terrainTiles = Object.entries(context.latestGameState.entities)
        .filter(([id, entity]) => {
          return !!entity.Terrain
        })

      const myAvatar = context.latestGameState.entities[this.selfEntityId]
      const startNavGridKey = buildNavGridKey(myAvatar.Transform.xPos, myAvatar.Transform.yPos, context.latestGameState.gridWidth)
      const targetAvatar = context.latestGameState.entities[context.target]
      const targetNavGridKey = buildNavGridKey(targetAvatar.Transform.xPos, targetAvatar.Transform.yPos, context.latestGameState.gridWidth)

      const path = computePathToTarget(
        this.navGrid,
        terrainTiles,
        startNavGridKey,
        targetNavGridKey
      )

      context.path = path

      return path.length > 0
    }, 'can-find-path-to-player')

    const moveTowardsPlayer = new Action(async (context) => {
      if (!context.path || context.path.length <= 1) {
        return nodeStatus.FAILURE
      }

      const nextGridKey = context.path[1]
      const targetX = nextGridKey.split(',')[0] * context.latestGameState.gridWidth
      const targetY = nextGridKey.split(',')[1] * context.latestGameState.gridWidth

      const myAvatar = context.latestGameState.entities[this.selfEntityId]
      const myX = myAvatar.Transform.xPos
      const myY = myAvatar.Transform.yPos

      const epsilon = context.latestGameState.gridWidth * 0.1

      if (myX < targetX - epsilon) {
        this.move('right')
      }

      if (myX > targetX + epsilon) {
        this.move('left')
      }

      if (myY > targetY - epsilon) {
        this.move('down')
      }

      if (myY < targetY + epsilon) {
        this.move('up')
      }
    }, 'move-towards-player')

    chasePlayerSequence.addChild(isPlayerNear)
    chasePlayerSequence.addChild(canFindPathToPlayer)
    chasePlayerSequence.addChild(moveTowardsPlayer)

    root.addChild(chasePlayerSequence)

    tree.setRoot(root)

    return tree
  }
}

module.exports = PathFindingPursuit
