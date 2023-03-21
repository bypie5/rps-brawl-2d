const commandTypes = require('../../common/gameplayCommands')
const { v } = require('../schemas')

const services = require('../services/services')

const gameplayCommands = {
    move: {
        type: commandTypes.MOVE,
        schema: {
            id: '/MoveGameplayCommand',
            type: 'object',
            properties: {
                entityId: {
                    type: 'string',
                    required: true
                },
                direction: {
                    type: 'string',
                    required: true,
                    enum: ['up', 'down', 'left', 'right']
                }
            }
        }
    }
}

// register schemas to validator
for (const msgType in gameplayCommands) {
    v.addSchema(gameplayCommands[msgType].schema, gameplayCommands[msgType].schema.id)
}

const handlers = {
    [gameplayCommands.move.type]: (ws, payload) => {
        // check that payload matches schema
        const validationResult = v.validate(payload, gameplayCommands.move.schema)
        if (!validationResult.valid) {
            console.log('Invalid message: ' + validationResult.errors)
            return
        }

        const sender = ws.id
        const session = services.sessionManager.findSessionByUser(sender)
        if (session) {
            const { entityId, direction } = payload
            const { Transform } = session.getEntity(entityId)
            if (!Transform) {
                return
            }

            switch (direction) {
                case 'up':
                    Transform.yVel = 1
                    break
                case 'down':
                    Transform.yVel = -1
                    break
                case 'left':
                    Transform.yVel = -1
                    break
                case 'right':
                    Transform.yVel = 1
                    break
                default:
                    break
            }
        }
    }
}

function handleGameplayCommand(ws, msg, type) {
    const handler = handlers[type]
    if (handler) {
        handler(ws, msg)
    }
}

module.exports = handleGameplayCommand
