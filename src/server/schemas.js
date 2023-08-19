const Validator = require('jsonschema').Validator
const v = new Validator()

const sessionConfigSchema = {
    id: '/SessionConfig',
    type: 'object',
    properties: {
        maxPlayers: {
            type: 'integer',
            minimum: 1,
            maximum: 15,
            required: true
        },
        map: {
            type: 'string',
            required: true,
            enum: ['map0', 'map1', 'map2', 'map3']
        },
        gameMode: {
            type: 'string',
            required: true,
            enum: ['elimination', 'endless']
        },
        agentType: {
            type: 'string',
            required: false
        },
        initialSpawnLocations: {
            type: 'array',
            required: false,
            items: {
                type: 'object',
                properties: {
                    playerId: {
                        type: 'string',
                        required: true
                    },
                    xPos: {
                        type: 'number',
                        required: true
                    },
                    yPos: {
                        type: 'number',
                        required: true
                    }
                }
            }
        }
    }
}

const userFeedbackSchema = {
    id: '/UserFeedback',
    type: 'object',
    properties: {
        type: {
            type: 'string',
            required: true,
            enum: ['bug', 'comment', 'suggestion']
        },
        message: {
            type: 'string',
            required: true,
            minLength: 1,
            maxLength: 1000
        }
    }
}

v.addSchema(sessionConfigSchema, '/SessionConfig')
v.addSchema(userFeedbackSchema, '/UserFeedback')

module.exports = {
    v,
    sessionConfigSchema,
    userFeedbackSchema
}
