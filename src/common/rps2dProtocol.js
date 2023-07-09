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
                        required: false
                    },
                }
            }
        },
        UPGRADE_ANONYMOUS_WS: {
            type: 'UPGRADE_ANONYMOUS_WS',
            schema: {
                id: '/UpgradeAnonymousWs',
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        required: true
                    },
                    authToken: {
                        type: 'string',
                        required: true
                    }
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
        },
        PONG: {
            type: 'PONG',
            schema: {
                id: '/Pong',
                type: 'object',
                properties: {
                    type: { type: 'string' },
                    message: { type: 'string' }
                }
            }
        },
        DISCONNECT_FROM_SESSION: {
            type: 'DISCONNECT_FROM_SESSION',
            schema: {
                id: '/DisconnectFromSession',
                type: 'object',
                properties: {
                    type: { type: 'string' },
                    sessionId: { type: 'string' }
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
                    isCheckpoint: { type: 'boolean' },
                    removedEntities: { type: 'array' },
                }
            }
        },
        UPGRADED_WS_CONNECTION: {
            type: 'UPGRADED_WS_CONNECTION',
            schema: {
                id: '/UpgradedWsConnection',
                type: 'object',
                properties: {
                    type: { type: 'string' },
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
        },
        PING: {
            type: 'PING',
            schema: {
                id: '/Ping',
                type: 'object',
                properties: {
                    type: { type: 'string' },
                    message: { type: 'string' },
                }
            }
        },
        DISCONNECTED: {
            type: 'DISCONNECTED',
            schema: {
                id: '/Disconnected',
                type: 'object',
                properties: {
                    type: { type: 'string' },
                    message: { type: 'string' },
                    wasUserInitiated: { type: 'boolean' },
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
