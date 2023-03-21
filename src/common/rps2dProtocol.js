const { v } = require('../server/schemas')

const msgTypes = {
    clientToServer: {
        CONNECT_TO_SESSION: {
            type: 'CONNECT_TO_SESSION',
            schema: {
                id: '/ConnectToSession',
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        required: true
                    },
                    sessionId: {
                        type: 'string',
                        required: true
                    },
                    friendlyName: {
                        type: 'string',
                        required: true
                    },
                }
            }
        },
        GAMEPLAY_COMMAND: {
            type: 'GAMEPLAY_COMMAND',
            schema: {
                id: '/GameplayCommand',
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        required: true
                    },
                    gameplayCommandType: {
                        type: 'string',
                        required: true
                    },
                    payload: {
                        type: 'object',
                        required: true
                    }
                }
            }
        }
    },
    serverToClient: {
        WELCOME: {
            type: 'WELCOME',
            schema: {
                id: '/WelcomeToSession',
                type: 'object',
                properties: {
                    type: { type: 'string' },
                    id: { type: 'string' },
                    host: { type: 'string' },
                    isPrivate: { type: 'boolean' },
                    config: { $ref: '/SessionConfig' },
                    sessionState: { type: 'string' },
                }
            }
        },
        MATCH_STARTED: {
            type: 'MATCH_STARTED',
            schema: {
                id: '/MatchStarted',
                type: 'object',
                properties: {
                    type: { type: 'string' },
                    sessionState: { type: 'string' },
                }
            }
        },
        GAMESTATE_UPDATE: {
            type: 'GAMESTATE_UPDATE',
            schema: {
                id: '/GameStateUpdate',
                type: 'object',
                properties: {
                    type: { type: 'string' },
                    gameContext: { type: 'object' },
                }
            }
        },
        ERROR: {
            type: 'ERROR',
            schema: {
                id: '/Error',
                type: 'object',
                properties: {
                    type: { type: 'string' },
                    message: { type: 'string' },
                }
            }
        }
    }
}

// register schemas to validator
for (const msgType in msgTypes.serverToClient) {
    v.addSchema(msgTypes.serverToClient[msgType].schema, msgTypes.serverToClient[msgType].schema.id)
}

for (const msgType in msgTypes.clientToServer) {
    v.addSchema(msgTypes.clientToServer[msgType].schema, msgTypes.clientToServer[msgType].schema.id)
}

module.exports = msgTypes
