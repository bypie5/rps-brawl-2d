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
        agentType: {
            type: 'string',
            required: false
        }
    }
}

v.addSchema(sessionConfigSchema, '/SessionConfig')

module.exports = {
    v,
    sessionConfigSchema
}
