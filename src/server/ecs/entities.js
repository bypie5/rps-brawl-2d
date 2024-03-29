const components = require('./components')
const { v } = require('../schemas')
const logger = require('../util/logger')

function randomRockPaperScissors () {
    const rps = ['rock', 'paper', 'scissors']
    return rps[Math.floor(Math.random() * rps.length)]
}

function validateEntity (entity) {
    for (const component in components) {
        const validationResult = v.validate(entity[components[component].name], components[component].schema)
        if (!validationResult.valid) {
            logger.error('Invalid component: ' + validationResult.errors)
            return false
        }
    }

    return true
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
                // keep stuff in here serializable (no functions, no classes, no sets, no maps, etc.)
                lives: 4,
                rockPaperScissors: randomRockPaperScissors(),
                ticksSinceStartedRespawning: -1,
                stateSwitchCooldownMaxTicks: 50,
                stateSwitchCooldownTicks: 0,
                firstSpawn: true,
                collisionsWithOtherPlayers: [], // entity ids
                activePowerUp: null,
                ticksWithActivePowerUp: 0,
                kills: 0,
                ticksSinceLastStateSwitch: 0,
                autoStateSwitched: false,
            }
        },
        [components.HitBox.name]: {
            width: 2.25,
            height: 1.5,
            physicsEnabled: true
        }
    }

    if (!validateEntity(entity)) {
        return
    }

    return entity
}

function buildBarrierEntity (gridWidth, x, y, spriteId) {
    const entity = {
        [components.Transform.name]: {
            xPos: x,
            yPos: y,
            xVel: 0,
            yVel: 0
        },
        [components.Barrier.name]: {
            spriteId: Number(spriteId)
        },
        [components.HitBox.name]: {
            width: gridWidth,
            height: gridWidth,
            physicsEnabled: true
        }
    }

    if (!validateEntity(entity)) {
        return
    }

    return entity
}

function buildTerrainEntity (gridWidth, x, y, spriteId) {
    const entity = {
        [components.Transform.name]: {
            xPos: x,
            yPos: y,
            xVel: 0,
            yVel: 0
        },
        [components.Terrain.name]: {
            spriteId: Number(spriteId)
        },
        [components.HitBox.name]: {
            width: gridWidth,
            height: gridWidth,
            physicsEnabled: false
        }
    }

    if (!validateEntity(entity)) {
        return
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

    if (!validateEntity(entity)) {
        return
    }

    return entity
}

function buildTieBreakerManagerEntity (playerEntityIds, currTrick, x, y) {
    const entity = {
        [components.TieBreaker.name]: {
            idsOfCohortMembers: playerEntityIds,
            state: 'init',
            tieBreakerState: {
                currRound: 0,
                ticksBetweenRounds: 33 * 4,
                interRoundTicks: 0,
                maxTicksPerRound: 33 * 8,
                currRoundMaxTicks: 33 * 8,
                minTicksPerRound: 33 * 3,
                currRoundTick: 0,
                summaryDisplayMaxTicks: 33 * 3.5,
                summaryDisplayTick: 0,
                hasAtLeastOneTieInRound: false,
            },
            createdAtTick: currTrick
        },
        [components.Transform.name]: {
            xPos: x,
            yPos: y,
            xVel: 0,
            yVel: 0
        }
    }

    if (!validateEntity(entity)) {
        return
    }

    return entity
}

function buildPowerUpEntity (type, x, y) {
    const entity = {
        [components.Transform.name]: {
            xPos: x,
            yPos: y,
            xVel: 0,
            yVel: 0
        },
        [components.PowerUp.name]: {
            type: type,
            ticksSinceCreated: 0,
            isActive: true
        },
        [components.HitBox.name]: {
            width: 3,
            height: 3,
            physicsEnabled: true
        }
    }

    if (!validateEntity(entity)) {
        return
    }

    return entity
}

function buildKillStreakScoreKeeper () {
    const entity = {
        [components.KillStreakScoreBoard.name]: {
            highestKillStreakByPlayerId: {}
        }
    }

    if (!validateEntity(entity)) {
        return
    }

    return entity
}

function buildRoundTimer (maxRoundTimeMs) {
    const entity = {
        [components.RoundTimer.name]: {
            msRemaining: maxRoundTimeMs
        }
    }

    if (!validateEntity(entity)) {
        return
    }

    return entity
}

module.exports = {
    buildPlayerEntity,
    buildBarrierEntity,
    buildTerrainEntity,
    buildSpawnPointEntity,
    buildTieBreakerManagerEntity,
    buildPowerUpEntity,
    buildKillStreakScoreKeeper,
    buildRoundTimer
}
