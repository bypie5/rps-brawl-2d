const msgTypes = require('../../common/rps2dProtocol')
const commandTypes = require('../../common/gameplayCommands')

class CpuAgent {
  constructor(botId, sessionId) {
    this.botId = botId
    this.sessionId = sessionId

    this.matchStarted = false
    this.selfEntityId = null
  }

  async tick(msg) {
    switch (msg.type) {
      case msgTypes.serverToClient.MATCH_STARTED.type:
        this.matchStarted = true
        break
      case msgTypes.serverToClient.GAMESTATE_UPDATE.type:
        if (!this.selfEntityId) {
          const { gameContext } = msg
          for (const [entityId, entity] of Object.entries(gameContext.entities)) {
            if (entity.Avatar && entity.Avatar.playerId.includes(this.botId)) {
              this.selfEntityId = entityId
              break
            }
          }
        }

        console.log(this.selfEntityId)

        if (this.matchStarted && this.selfEntityId) {
          /*this.services.forwardMsgService.forwardMsg(this.selfEntityId, 'MOVE', {
            entityId: this.selfEntityId,
            direction: 'up'
          })*/
        }
        break
      default:
        console.log(`Unhandled message type: ${msg.type}`)
        break
    }
  }

  getBotId() {
    return this.botId
  }
}

module.exports = CpuAgent
