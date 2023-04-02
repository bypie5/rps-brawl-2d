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
                },
                speed: {
                    type: 'number',
                    required: true,
                    minimum: 0,
                    maximum: 2
                },
                state: {
                    type: 'string',
                    required: true,
                    enum: ['dead', 'alive', 'respawning', 'spectating']
                },
                stateData: {
                    type: 'object',
                    required: true,
                }
            }
        }
    },
    HitBox: {
        name: 'HitBox',
        schema: {
            id: '/HitBox',
            type: 'object',
            properties: {
                size: {
                    type: 'number',
                    required: true,
                }
            }
        }
    },
    Barrier: {
        name: 'Barrier',
        schema: {
            id: '/Barrier',
            type: 'object',
            properties: {
                spriteId: {
                    type: 'number',
                    required: true,
                }
            }
        }
    },
    Terrain: {
        name: 'Terrain',
        schema: {
            id: '/Terrain',
            type: 'object',
            properties: {
                spriteId: {
                    type: 'number',
                    required: true,
                }
            }
        }
    },
    SpawnPoint: {
        name: 'SpawnPoint',
        schema: {
            id: '/SpawnPoint',
            type: 'object',
            properties: {
            }
        }
    }
}

// register schemas to validator
for (const component in components) {
    v.addSchema(components[component].schema, components[component].schema.id)
}

module.exports = components
