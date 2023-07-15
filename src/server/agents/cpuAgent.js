const msgTypes = require('../../common/rps2dProtocol')
const commandTypes = require('../../common/gameplayCommands')

class CpuAgent {
  constructor(botId, sessionId, msgHandlers) {
    this.botId = botId
    this.sessionId = sessionId
    this.msgHandlers = msgHandlers

    this.matchStarted = false
    this.selfEntityId = null

    this.behaviorTree = null

    this.gameStateBroadcastsQueue = [] // Object { tick: Number, msg: gameContext }
    this.queueMaxSize = 100
  }
  
  buildBehaviorTree() {
    throw new Error('Not implemented')
  }

  setBehaviorTree(behaviorTree) {
    this.behaviorTree = behaviorTree
  }

  setMatchStarted(matchStarted) {
    this.matchStarted = matchStarted
  }

  async tick(msg) {
    switch (msg.type) {
      case msgTypes.serverToClient.MATCH_STARTED.type:
        this.matchStarted = true
        break
      case msgTypes.serverToClient.GAMESTATE_UPDATE.type:
        const { gameContext } = msg
        this.gameStateBroadcastsQueue.push({ tick: gameContext.currentTick, msg: gameContext })
        if (!this.selfEntityId) {
          for (const [entityId, entity] of Object.entries(gameContext.entities)) {
            if (entity.Avatar && entity.Avatar.playerId.includes(this.botId)) {
              this.selfEntityId = entityId
              break
            }
          }
        } else if (this.behaviorTree) {
          this.behaviorTree.tick()
        }
        break
      default:
        console.log(`Unhandled message type: ${msg.type}`)
        break
    }
  }

  move(direction) {
    if (this.matchStarted && this.selfEntityId) {
      this.msgHandlers[commandTypes.MOVE](this.botId, {
        entityId: this.selfEntityId,
        direction
      })
    }
  }

  stop(direction) {
    if (this.matchStarted && this.selfEntityId) {
      this.msgHandlers[commandTypes.STOP](this.botId, {
        entityId: this.selfEntityId,
        direction
      })
    }
  }

  stateShiftLeft() {
    if (this.matchStarted && this.selfEntityId) {
      this.msgHandlers[commandTypes.STATE_SHIFT_LEFT](this.botId, {
        entityId: this.selfEntityId
      })
    }
  }

  stateShiftRight() {
    if (this.matchStarted && this.selfEntityId) {
      this.msgHandlers[commandTypes.STATE_SHIFT_RIGHT](this.botId, {
        entityId: this.selfEntityId
      })
    }
  }

  getBotId() {
    return this.botId
  }

  _pushGameStateBroadcast(tick, gameContext) {
    if (this.gameStateBroadcastsQueue.length >= this.queueMaxSize) {
      this.gameStateBroadcastsQueue.shift()
    }
    this.gameStateBroadcastsQueue.push({
      tick,
      msg: gameContext
    })
  }
}

module.exports = CpuAgent
