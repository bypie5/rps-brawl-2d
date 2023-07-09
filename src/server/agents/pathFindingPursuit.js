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
} = require("./util")
const { rpsCompare } = require("../ecs/util")

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
      minTicksBetweenRpsShift: 2, // ~60ms if 33 ticks per second
      maxTicksBetweenRpsShift: 6, // ~180ms if 33 ticks per second
      ticksUntilNextRpsShift: 0,
      myRpsState: null,
      targetRpsState: null,
      minTicksBetweenChangingRandomTarget: 33,
      maxTicksBetweenChangingRandomTarget: 66,
      ticksUntilNextChangingRandomTarget: 0,
    }

    const tree = new BehaviorTree(context, () => {
      // init context with latest game state
      const latest = this.gameStateBroadcastsQueue.pop()
      if (latest) {
        context.latestGameState = latest.msg
      }
    })

    const root = new Sequence('path-finding-pursuit-root')

    const targetPrioritySelector = new Fallback('target-priority-selector')

    const chasePlayerSequence = new Sequence('chase-player-sequence')

    const isPlayerNear = new Condition((context) => {
      const windowWidth = 6
      const windowHeight = 6

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

      if (nearestEntity && nearestEntity[0] !== null) {
        context.target = nearestEntity[0] // [0] is the entity id
      } else {
        return false
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
      this._moveToTarget(myX, myY, targetX, targetY, epsilon)
    }, 'move-towards-player')

    const moveTowardsPowerUp = new Sequence('move-towards-power-up')

    const isPowerUpNear = new Condition((context) => {
      const windowWidth = 6
      const windowHeight = 6

      const myAvatar = context.latestGameState.entities[this.selfEntityId]
      const currGridKey = computeGridKey(myAvatar.Transform.xPos, myAvatar.Transform.yPos, context.latestGameState.gridWidth)
      const playerEntitiesInScene = Object.entries(context.latestGameState.entities)
        .filter(([id, entity]) => {
          return !!entity.PowerUp
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

      if (nearestEntity && nearestEntity[0] && myAvatar.Avatar.stateData.activePowerUp === null) {
        context.target = nearestEntity[0] // [0] is the entity id
      } else {
        return false
      }

      return context.target !== null
    })

    const canFindPathToPowerUp = new Condition((context) => {
      const terrainTiles = Object.entries(context.latestGameState.entities)
        .filter(([id, entity]) => {
          return !!entity.Terrain
        })

      const myAvatar = context.latestGameState.entities[this.selfEntityId]
      const startNavGridKey = buildNavGridKey(myAvatar.Transform.xPos, myAvatar.Transform.yPos, context.latestGameState.gridWidth)
      const targetPowerUp = context.latestGameState.entities[context.target]
      const targetNavGridKey = buildNavGridKey(targetPowerUp.Transform.xPos, targetPowerUp.Transform.yPos, context.latestGameState.gridWidth)

      const path = computePathToTarget(
        this.navGrid,
        terrainTiles,
        startNavGridKey,
        targetNavGridKey
      )

      context.path = path

      return path.length > 0
    })

    const moveToPowerUp = new Action(async (context) => {
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
      this._moveToTarget(myX, myY, targetX, targetY, epsilon)
    }, 'move-towards-player')

    const moveToRandomLocation = new Sequence('move-to-random-location')

    const pickRandomLocationAction = new Action(async (context) => {
      const terrainTiles = Object.entries(context.latestGameState.entities)
        .filter(([id, entity]) => {
          return !!entity.Terrain
        })

      if (!context.latestGameState.entities[context.target]) {
        context.target = null
      }

      if (context.target) {
        // move towards target
        const myAvatar = context.latestGameState.entities[this.selfEntityId]
        const startNavGridKey = buildNavGridKey(myAvatar.Transform.xPos, myAvatar.Transform.yPos, context.latestGameState.gridWidth)
        const targetTerrain = context.latestGameState.entities[context.target]
        const targetNavGridKey = buildNavGridKey(targetTerrain.Transform.xPos, targetTerrain.Transform.yPos, context.latestGameState.gridWidth)

        const path = computePathToTarget(
          this.navGrid,
          terrainTiles,
          startNavGridKey,
          targetNavGridKey
        )

        if (path.length > 1) {
          const nextGridKey = path[1]
          const targetX = nextGridKey.split(',')[0] * context.latestGameState.gridWidth
          const targetY = nextGridKey.split(',')[1] * context.latestGameState.gridWidth

          const myAvatar = context.latestGameState.entities[this.selfEntityId]
          const myX = myAvatar.Transform.xPos
          const myY = myAvatar.Transform.yPos

          const epsilon = context.latestGameState.gridWidth * 0.1
          this._moveToTarget(myX, myY, targetX, targetY, epsilon)
        } else {
          context.target = null // we're at the target, so clear it
        }
      }

      if (context.ticksUntilNextChangingRandomTarget < 0) {
        // pick a random tile
        const randomTile = terrainTiles[Math.floor(Math.random() * terrainTiles.length)]
        context.target = randomTile[0] // [0] is the entity id
        context.ticksUntilNextChangingRandomTarget = Math.floor(Math.random() * context.maxTicksBetweenChangingRandomTarget) + context.maxTicksBetweenChangingRandomTarget
      } else {
        context.ticksUntilNextChangingRandomTarget--
      }
    })

    const matchTarget = new Fallback('match-target')

    const isMatchingRpsStateOfTarget = new Condition((context) => {
      if (!context.target || !context.latestGameState.entities[context.target] || !context.latestGameState.entities[context.target].Avatar) {
        return true // no target, so we're matching the target
      }

      if (context.ticksUntilNextRpsShift > 0) {
        context.ticksUntilNextRpsShift--
        return true // simulating reaction time
      }

      const myAvatar = context.latestGameState.entities[this.selfEntityId]
      const targetAvatar = context.latestGameState.entities[context.target]

      const myRpsState = myAvatar.Avatar.stateData.rockPaperScissors
      const targetRpsState = targetAvatar.Avatar.stateData.rockPaperScissors
      context.myRpsState = myRpsState
      context.targetRpsState = targetRpsState

      context.ticksUntilNextRpsShift = Math.floor(Math.random() * (context.maxTicksBetweenRpsShift - context.minTicksBetweenRpsShift + 1)) + context.minTicksBetweenRpsShift

      return rpsCompare(myRpsState, targetRpsState) === 1
    })

    const matchRpsStateOfTarget = new Action(async (context) => {
      const comp = rpsCompare(context.myRpsState, context.targetRpsState)
      if (comp === 0) {
        this.stateShiftRight()
      } else if (comp === -1) {
        this.stateShiftLeft()
      }
    }, 'match-rps-state-of-target')

    chasePlayerSequence.addChild(isPlayerNear)
    chasePlayerSequence.addChild(canFindPathToPlayer)
    chasePlayerSequence.addChild(moveTowardsPlayer)

    moveTowardsPowerUp.addChild(isPowerUpNear)
    moveTowardsPowerUp.addChild(canFindPathToPowerUp)
    moveTowardsPowerUp.addChild(moveToPowerUp)

    moveToRandomLocation.addChild(pickRandomLocationAction)

    targetPrioritySelector.addChild(chasePlayerSequence) // highest priority is to chase player
    targetPrioritySelector.addChild(moveTowardsPowerUp) // second priority is to move towards power up
    targetPrioritySelector.addChild(moveToRandomLocation) // third priority is to move to a random location

    matchTarget.addChild(isMatchingRpsStateOfTarget)
    matchTarget.addChild(matchRpsStateOfTarget)

    root.addChild(targetPrioritySelector)
    root.addChild(matchTarget)

    tree.setRoot(root)

    return tree
  }

  _moveToTarget(myX, myY, targetX, targetY, epsilon) {
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

    // stop moving if we're close enough
    if (Math.abs(myX - targetX) < epsilon) {
      this.stop('right')
      this.stop('left')
    }

    if (Math.abs(myY - targetY) < epsilon) {
      this.stop('up')
      this.stop('down')
    }
  }

  _stopMoving() {
    this.stop('up')
    this.stop('down')
    this.stop('left')
    this.stop('right')
  }
}

module.exports = PathFindingPursuit
