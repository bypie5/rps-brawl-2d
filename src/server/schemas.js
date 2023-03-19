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
        }
    }
}

v.addSchema(sessionConfigSchema, '/SessionConfig')

module.exports = {
    v,
    sessionConfigSchema
}
