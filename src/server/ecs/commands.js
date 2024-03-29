const commandTypes = require('../../common/gameplayCommands')
const { v } = require('../schemas')
const { directionEnum, shiftRps } = require('./util')

const services = require('../services/services')
const logger = require('../util/logger')

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
    },
    stateShiftLeft: {
        type: commandTypes.STATE_SHIFT_LEFT,
        schema: {
            id: '/StateShiftLeftGameplayCommand',
            type: 'object',
            properties: {
                entityId: {
                    type: 'string',
                    required: true
                }
            }
        }
    },
    stateShiftRight: {
        type: commandTypes.STATE_SHIFT_RIGHT,
        schema: {
            id: '/StateShiftRightGameplayCommand',
            type: 'object',
            properties: {
                entityId: {
                    type: 'string',
                    required: true
                }
            }
        }
    },
    stateChange: {
        type: commandTypes.STATE_CHANGE,
        schema: {
            id: '/StateChangeGameplayCommand',
            properties: {
                entityId: {
                    type: 'string',
                    required: true
                },
                state: {
                    type: 'string',
                    required: true,
                    enum: ['rock', 'paper', 'scissors']
                }
            }
        }

    }
}

const commandTypeToHandlerType = {}

for (const handler in gameplayCommands) {
    commandTypeToHandlerType[gameplayCommands[handler].type] = handler
}

// register schemas to validator
for (const msgType in gameplayCommands) {
    v.addSchema(gameplayCommands[msgType].schema, gameplayCommands[msgType].schema.id)
}

const handlers = {
    [gameplayCommands.move.type]: (sender, payload) => {
        const session = services.sessionManager.findSessionByUser(sender)
        if (session) {
            const { entityId, direction } = payload
            const { Transform, Avatar, HitBox } = session.getEntity(entityId)
            if (!Transform || !Avatar || !HitBox) {
                return
            }

            if (Avatar.playerId !== sender) {
                return // prevent modifying other players
            }

            if (Avatar.state !== 'alive' || !HitBox.physicsEnabled) {
                return
            }

            const speedMultiplier = Avatar.stateData.activePowerUp === 'speed' ? Avatar.speed * 2 : Avatar.speed
            let sm = 7.5
            switch (speedMultiplier) {
                case 0:
                    sm = 0
                    break
                case 1:
                    sm = 7.5
                    break
                case 2:
                    sm = 10
                    break
                default:
                    sm = 7.5
                    break
            }

            let newXVel = Transform.xVel
            let newYVel = Transform.yVel
            switch (direction) {
                case 'up':
                    newYVel = sm
                    break
                case 'down':
                    newYVel = -1 * sm
                    break
                case 'left':
                    newXVel = -1 * sm
                    break
                case 'right':
                    newXVel = sm
                    break
                default:
                    break
            }

            if (newXVel !== 0 && newYVel !== 0) {
                newXVel = Math.sign(newXVel) * (sm / Math.sqrt(2))
                newYVel = Math.sign(newYVel) * (sm / Math.sqrt(2))
            }

            Transform.xVel = newXVel
            Transform.yVel = newYVel
        }
    },
    [gameplayCommands.stop.type]: (sender, payload) => {
        const session = services.sessionManager.findSessionByUser(sender)
        if (session) {
            const { entityId, direction } = payload
            const { Transform, Avatar } = session.getEntity(entityId)
            if (!Transform || !Avatar) {
                return
            }

            if (Avatar.playerId !== sender) {
                return // prevent modifying other players
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
    },
    [gameplayCommands.stateShiftLeft.type]: (sender, payload) => {
        const session = services.sessionManager.findSessionByUser(sender)
        if (session) {
            const { entityId } = payload
            const { Avatar } = session.getEntity(entityId)
            if (!Avatar) {
                return
            }

            if (Avatar.playerId !== sender) {
                return // prevent modifying other players
            }

            if (
                Avatar.state === 'dead'
                || Avatar.state === 'respawning'
                || Avatar.state === 'spectating'
            ) {
                return
            }

            if (Avatar.stateData.stateSwitchCooldownTicks > 0) {
                return
            }
            
            const newState = shiftRps(Avatar.stateData.rockPaperScissors, directionEnum.LEFT)
            Avatar.stateData.rockPaperScissors = newState
            Avatar.stateData.stateSwitchCooldownTicks = Avatar.stateData.stateSwitchCooldownMaxTicks
        }
    },
    [gameplayCommands.stateShiftRight.type]: (sender, payload) => {
        const session = services.sessionManager.findSessionByUser(sender)
        if (session) {
            const { entityId } = payload
            const { Avatar } = session.getEntity(entityId)
            if (!Avatar) {
                return
            }

            if (Avatar.playerId !== sender) {
                return // prevent modifying other players
            }

            if (Avatar.state === 'dead'
                || Avatar.state === 'respawning'
                || Avatar.state === 'spectating') {
                return
            }

            if (Avatar.stateData.stateSwitchCooldownTicks > 0) {
                return
            }

            const newState = shiftRps(Avatar.stateData.rockPaperScissors, directionEnum.RIGHT)
            Avatar.stateData.rockPaperScissors = newState
            Avatar.stateData.stateSwitchCooldownTicks = Avatar.stateData.stateSwitchCooldownMaxTicks
        }
    },
    [gameplayCommands.stateChange.type]: (sender, payload) => {
        const session = services.sessionManager.findSessionByUser(sender)
        if (session) {
            const { entityId, state } = payload
            const { Avatar } = session.getEntity(entityId)
            if (!Avatar) {
                return
            }

            if (Avatar.playerId !== sender) {
                return // prevent modifying other players
            }

            if (Avatar.state === 'dead'
              || Avatar.state === 'respawning'
              || Avatar.state === 'spectating') {
                return
            }

            if (Avatar.stateData.stateSwitchCooldownTicks > 0) {
                return
            }

            // change state only if not already in that state
            if (Avatar.stateData.rockPaperScissors === state) {
                Avatar.stateData.ticksSinceLastStateSwitch = 0
                return
            }

            Avatar.stateData.rockPaperScissors = state
            Avatar.stateData.stateSwitchCooldownTicks = Avatar.stateData.stateSwitchCooldownMaxTicks
            Avatar.stateData.ticksSinceLastStateSwitch = 0
        }
    }
}

function handleGameplayCommand(ws, msg, type) {
    const handler = handlers[type]
    if (handler) {
        // check that payload matches schema
        const handlerType = commandTypeToHandlerType[type]
        const validationResult = v.validate(msg, gameplayCommands[handlerType].schema)
        if (!validationResult.valid) {
            logger.error('Invalid message: ' + validationResult.errors)
            return
        }

        const sender = ws.id
        handler(sender, msg)
    }
}


function applyCommands(commandQueue) {
    for (const command of commandQueue) {
        const { ws, msg, type } = command
        handleGameplayCommand(ws, msg, type)
    }
}

function enqueueCommand(ws, msg, type) {
    const sender = ws.id
    const session = services.sessionManager.findSessionByUser(sender)
    if (session) {
        session.pushCommand(ws, msg, type, applyCommands)
    }
}

services.sessionManager.registerMessageHandlers(handlers)

module.exports = {
    enqueueCommand,
    gameplayCommands,
    handlerMethods: handlers,
}
