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
