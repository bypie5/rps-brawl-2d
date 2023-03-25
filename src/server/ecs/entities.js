const components = require('./components')
const { v } = require('../schemas')

function randomRockPaperScissors () {
    const rps = ['rock', 'paper', 'scissors']
    return rps[Math.floor(Math.random() * rps.length)]
}

function buildPlayerEntity (playerId, x, y) {
    const entity = {
        [components.Transform.name]: {
            xPos: x,
            yPos: y,
            xVel: 0,
            yVel: 0
        },
        [components.Avatar.name]: {
            playerId: playerId,
            state: 'respawning',
            speed: 1,
            stateData: {
                lives: 3,
                rockPaperScissors: randomRockPaperScissors(),
                ticksSinceStartedRespawning: -1
            }
        },
        [components.HitBox.name]: {
            size: 3
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

function buildBarrierEntity (gridWidth, x, y) {
    const entity = {
        [components.Transform.name]: {
            xPos: x,
            yPos: y,
            xVel: 0,
            yVel: 0
        },
        [components.Barrier.name]: {},
        [components.HitBox.name]: {
            size: gridWidth
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
    buildBarrierEntity,
    buildSpawnPointEntity
}