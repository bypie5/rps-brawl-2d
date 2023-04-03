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
    },
    stop: {
        type: commandTypes.STOP,
        schema: {
            id: '/StopGameplayCommand',
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
            const { Transform, Avatar } = session.getEntity(entityId)
            if (!Transform || !Avatar) {
                return
            }

            const speedMultiplier = Avatar.speed
            let sm = 1
            switch (speedMultiplier) {
                case 0:
                    sm = 0
                    break
                case 1:
                    sm = 20
                    break
                case 2:
                    sm = 30
                    break
                default:
                    sm = 20
                    break
            }

            let xVel = 0
            let yVel = 0
            switch (direction) {
                case 'up':
                    yVel = sm
                    break
                case 'down':
                    yVel = -1 * sm
                    break
                case 'left':
                    xVel = -1 * sm
                    break
                case 'right':
                    xVel = sm
                    break
                default:
                    break
            }

            Transform.xVel = xVel
            Transform.yVel = yVel

            console.log(`Velocity: (${Transform.xVel}, ${Transform.yVel})`)
        }
    },
    [gameplayCommands.stop.type]: (ws, payload) => {
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
                    Transform.yVel = 0
                    break
                case 'down':
                    Transform.yVel = 0
                    break
                case 'left':
                    Transform.xVel = 0
                    break
                case 'right':
                    Transform.xVel = 0
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
