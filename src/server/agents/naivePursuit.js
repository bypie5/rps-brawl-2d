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
  getNearestEntityByGridKey
} = require("./util")

class NaivePursuit extends CpuAgent {
  constructor(botId, sessionId, msgHandlers) {
    super(botId, sessionId, msgHandlers)

    this.setBehaviorTree(this.buildBehaviorTree())
  }

  buildBehaviorTree() {
    const context = {
      target: null,
      latestGameState: null,
      changeDirectionMaxCooldown: 10,
      changeDirectionCooldown: 0,
    }

    const tree = new BehaviorTree(context, () => {
      // init context with latest game state
      const latest = this.gameStateBroadcastsQueue.pop()
      if (latest) {
        context.latestGameState = latest.msg
      }
    })

    const root = new Fallback()

    const sequence = new Sequence()

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
    })

    const stepTowardsTarget = new Action(async (context) => {
      if (context.changeDirectionCooldown > 0) {
        context.changeDirectionCooldown--
      } else {
        const myAvatar = context.latestGameState.entities[this.selfEntityId]
        const targetAvatar = context.latestGameState.entities[context.target]
        const myX = myAvatar.Transform.xPos
        const myY = myAvatar.Transform.yPos
        const targetX = targetAvatar.Transform.xPos
        const targetY = targetAvatar.Transform.yPos

        if (myX < targetX) {
          this.move('right')
        }
        
        if (myX > targetX) {
          this.move('left')
        }
        
        if (myY < targetY) {
          this.move('up')
        } 
        
        if (myY > targetY) {
          this.move('down')
        }

        context.changeDirectionCooldown = context.changeDirectionMaxCooldown
      }
    })

    sequence.addChild(isPlayerNear)
    sequence.addChild(stepTowardsTarget)

    const moveRandomly = new Action(async (context) => {
      const myAvatar = context.latestGameState.entities[this.selfEntityId]
      if (myAvatar.Transform.xVel !== 0 || myAvatar.Transform.yVel !== 0) {
        return nodeStatus.SUCCESS
      }

      const directions = ['left', 'right', 'up', 'down']
      const randomDirection = directions[Math.floor(Math.random() * directions.length)]

      this.move(randomDirection)

      return nodeStatus.SUCCESS
    })

    root.addChild(sequence)
    root.addChild(moveRandomly)

    tree.setRoot(root)

    return tree
  }
}

module.exports = NaivePursuit
