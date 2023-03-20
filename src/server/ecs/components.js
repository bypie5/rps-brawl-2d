const { v } = require('../schemas')

const components = {
    Transform: {
        name: 'Transform',
        schema: {
            id: '/Transform',
            type: 'object',
            properties: {
                xPos: {
                    type: 'number',
                    required: true,
                },
                yPos: {
                    type: 'number',
                    required: true,
                },
                xVel: {
                    type: 'number',
                    required: true,
                },
                yVel: {
                    type: 'number',
                    required: true,
                },
            }
        }   
    },
    Avatar: {
        name: 'Avatar',
        schema: {
            id: '/Avatar',
            type: 'object',
            properties: {
                playerId: {
                    type: 'string',
                    required: true,
                }
            }
        }
    }
}

// register schemas to validator
for (const component in components) {
    v.addSchema(components[component].schema, components[component].schema.id)
}

module.exports = components
