const components = require('./components')
const { v } = require('../schemas')

function buildPlayerEntity (playerId, x, y) {
    const entity = {
        [components.Transform.name]: {
            xPos: x,
            yPos: y,
            xVel: 0,
            yVel: 0
        },
        [components.Avatar.name]: {
            playerId: playerId
        }
    }

    for (const component in components) {
        const validationResult = v.validate(entity[components[component].name], components[component].schema)
        if (!validationResult.valid) {
            console.log('Invalid component: ' + validationResult.errors)
            return
        }
    }

    return entity
}

function buildSpawnPointEntity (x, y) {
    const entity = {
        [components.Transform.name]: {
            xPos: x,
            yPos: y,
            xVel: 0,
            yVel: 0
        },
        [components.SpawnPoint.name]: {}
    }

    for (const component in components) {
        const validationResult = v.validate(entity[components[component].name], components[component].schema)
        if (!validationResult.valid) {
            console.log('Invalid component: ' + validationResult.errors)
            return
        }
    }

    return entity
}

module.exports = {
    buildPlayerEntity,
    buildSpawnPointEntity
}
