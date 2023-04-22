const {
    rpsCompare,
    replaceCollisionsWithOtherPlayersSet,
    resolveClusterMembers,
    createTieBreakerBracket,
    midMatchTieBreakerFSM,
    findEntityCenterOfCluster
} = require('./util')

const {
    buildTieBreakerManagerEntity
} = require('./entities')

function deltaTimeSeconds (gameContext) {
    return gameContext.deltaTime / 1000
}

function determineLogicalKey (xPos, yPos, gridWidth) {
    const x = Math.floor(xPos / gridWidth)
    const y = Math.floor(yPos / gridWidth)
    return x + '_' + y
}

function computeNeighborsOfGrid (key) {
    const [x, y] = key.split('_')

    const neighbors = []
    neighbors.push((parseInt(x) - 1) + '_' + y)
    neighbors.push((parseInt(x) + 1) + '_' + y)
    neighbors.push(x + '_' + (parseInt(y) - 1))
    neighbors.push(x + '_' + (parseInt(y) + 1))
    neighbors.push((parseInt(x) - 1) + '_' + (parseInt(y) - 1))
    neighbors.push((parseInt(x) + 1) + '_' + (parseInt(y) - 1))
    neighbors.push((parseInt(x) - 1) + '_' + (parseInt(y) + 1))
    neighbors.push((parseInt(x) + 1) + '_' + (parseInt(y) + 1))
    neighbors.push(x + '_' + y)

    return neighbors
}

function xAxisCausesCollison (player, otherEntity, dt) {
    const hasCollision = isColliding(player, otherEntity)
    player.Transform.xPos -= player.Transform.xVel * dt
    const hasCollisionAfter = isColliding(player, otherEntity)
    player.Transform.xPos += player.Transform.xVel * dt
    
    return hasCollision && !hasCollisionAfter
}

function yAxisCausesCollison (player, otherEntity, dt) {
    const hasCollision = isColliding(player, otherEntity)
    player.Transform.yPos -= player.Transform.yVel * dt
    const hasCollisionAfter = isColliding(player, otherEntity)
    player.Transform.yPos += player.Transform.yVel * dt

    return hasCollision && !hasCollisionAfter
}

function isColliding (entity1, entity2) {
    const x1 = entity1.Transform.xPos
    const y1 = entity1.Transform.yPos
    const x2 = entity2.Transform.xPos
    const y2 = entity2.Transform.yPos
    if (!entity1.HitBox || !entity2.HitBox || !entity1.HitBox.physicsEnabled || !entity2.HitBox.physicsEnabled) {
        return false
    }

    const height1 = entity1.HitBox.height
    const height2 = entity2.HitBox.height
    const width1 = entity1.HitBox.width
    const width2 = entity2.HitBox.width

    if (
        /*x1 < x2 + width2 &&
        x1 + width1 > x2 &&
        y1 < y2 + height2 &&
        y1 + height1 > y2*/
        x1 + width1 / 2 > x2 - width2 / 2 &&
        x1 - width1 / 2 < x2 + width2 / 2 &&
        y1 + height1 / 2 > y2 - height2 / 2 &&
        y1 - height1 / 2 < y2 + height2 / 2
    ) {
        return true
    }
    return false
}

function detectCollision (gameContext, entitiesByLogicalKey, entity, playerId) {
    const entityKey = determineLogicalKey(entity.Transform.xPos, entity.Transform.yPos, gameContext.gridWidth)
    const neighborsKeys = computeNeighborsOfGrid(entityKey)

    const collisions = []
    for (const key of neighborsKeys) {
        if (!entitiesByLogicalKey.has(key)) {
            continue
        }

        for (const id of entitiesByLogicalKey.get(key)) {
            if (id !== playerId && isColliding(gameContext.entities[id], entity)) {
                collisions.push(id)
            }
        }
    }

    return collisions
}

function resolveCollision (player, otherEntity, dt) {
    let playerCopy = JSON.parse(JSON.stringify(player))

    let newXPos = playerCopy.Transform.xPos
    let newYPos = playerCopy.Transform.yPos

    while (xAxisCausesCollison(playerCopy, otherEntity, dt)) {
        newXPos += playerCopy.Transform.xVel * dt * -1.1
        playerCopy.Transform.xPos = newXPos
    }

    while (yAxisCausesCollison(playerCopy, otherEntity, dt)) {
        newYPos += playerCopy.Transform.yVel * dt * -1.1
        playerCopy.Transform.yPos = newYPos
    }

    return { newXPos, newYPos }
}

function doRegularRpsMatch (player1, player2) {
    const player1Rps = player1.Avatar.stateData.rockPaperScissors
    const player2Rps = player2.Avatar.stateData.rockPaperScissors

    if (player1.Avatar.state === 'dead' || player2.Avatar.state === 'dead') {
        return
    }

    const result = rpsCompare(player1Rps, player2Rps)

    if (result === 1) {
        player2.Avatar.state = 'dead'
    } else if (result === -1) {
        player1.Avatar.state = 'dead'
    }
}

function physics (gameContext, session) {
    const entitiesByLogicalKey = new Map()
    for (const [id, entity] of Object.entries(gameContext.entities)) {
        if (entity.Transform) {
            const key = determineLogicalKey(entity.Transform.xPos, entity.Transform.yPos, gameContext.gridWidth)
            if (!entitiesByLogicalKey.has(key)) {
                entitiesByLogicalKey.set(key, [])
            }
            entitiesByLogicalKey.get(key).push(id)
        }
    }

    // update positions based on velocity
    const dt = deltaTimeSeconds(gameContext)
    for (const [id, entity] of Object.entries(gameContext.entities)) {
        if (entity.Transform && entity.Avatar) {
            const transform = entity.Transform
            transform.xPos += transform.xVel * dt
            transform.yPos += transform.yVel * dt

            const collisions = detectCollision(gameContext, entitiesByLogicalKey, entity, id)
            if (collisions.length > 0) {
                // player should be moved in the opposite direction of their velocity
                // by an an amount that places them just outside of the collision
                for (let id of collisions) {
                    const { newXPos, newYPos } = resolveCollision(entity, gameContext.entities[id], dt)
                    transform.xPos = newXPos
                    transform.yPos = newYPos
                }

                const otherPlayersColliding = collisions.map(id => {
                    return { id, entity: gameContext.entities[id] }
                }).filter(info => {
                    return info.entity.Avatar 
                        && info.entity.Avatar.playerId !== entity.Avatar.playerId
                })

                if (otherPlayersColliding.length > 0) {
                    const otherPlayerIds = otherPlayersColliding.map(info => info.id)
                    replaceCollisionsWithOtherPlayersSet(entity, otherPlayerIds)
                }
            } else {
                replaceCollisionsWithOtherPlayersSet(entity, [])
            }
        }
    }
}

function rps (gameContext, session) {
    const createdRpsMatches = new Set()
    for (const [id, entity] of Object.entries(gameContext.entities)) {
        if (entity.Avatar
            && entity.Avatar.state === 'alive'
            && entity.Avatar.stateData.collisionsWithOtherPlayers.length > 0) {
            const membersInCluster = resolveClusterMembers(entity, id, gameContext)  
            if (membersInCluster.length == 2) {
                // 2 players in cluster (regular collision)
                const player1 = gameContext.entities[membersInCluster[0]]
                const player2 = gameContext.entities[membersInCluster[1]]
                doRegularRpsMatch(player1, player2)
            } else if (membersInCluster.length > 2) {
                // cluster collision - must resolve ambiguity

                // does a tie breaker match already exist?
                for (const id of membersInCluster) {
                    const entity = gameContext.entities[id]
                    if (entity.Avatar.state === 'breakingtie') {
                        // tie breaker match already exists
                        return
                    }
                }

                // 1. disable physics for all players in cluster
                for (const id of membersInCluster) {
                    gameContext.entities[id].Avatar.state = 'breakingtie'
                    gameContext.entities[id].HitBox.physicsEnabled = false
                }

                // 2. create tie breaker match manager
                console.log('tie breaker match' + membersInCluster)
                const { closestEntityId } = findEntityCenterOfCluster(membersInCluster, gameContext)
                const { xPos, yPos } = gameContext.entities[closestEntityId].Transform
                const tieBreakerMatchManager = buildTieBreakerManagerEntity(membersInCluster, gameContext.currentTick, xPos, yPos)
                session.instantiateEntity(tieBreakerMatchManager)

                createdRpsMatches.add(tieBreakerMatchManager)
            }
        }

        if (entity.Avatar 
            && entity.Avatar.stateData.stateSwitchCooldownTicks > 0) {
            entity.Avatar.stateData.stateSwitchCooldownTicks--
        }
    }
}

function tieBreaker (gameContext, session) {
    for (const [id, entity] of Object.entries(gameContext.entities)) {
        if (entity.TieBreaker
            && !entity.TieBreaker.tournamentBracket) {
            entity.TieBreaker.tournamentBracket = createTieBreakerBracket(entity.TieBreaker.idsOfCohortMembers)
        }

        if (entity.TieBreaker
            && entity.TieBreaker.tournamentBracket) {
                midMatchTieBreakerFSM(entity, gameContext, () => {
                })
        }
    }
}

function spawn (gameContext, session) {
    // ticks happen about 30 times per second
    const ticksToRespawn = 3 * 30 // 3 seconds

    const spawnPoints = []
    const deadPlayers = []
    const respawningPlayers = []
    for (const [id, entity] of Object.entries(gameContext.entities)) {
        if (entity.SpawnPoint) {
            spawnPoints.push(id)
        }

        if (entity.Avatar && (entity.Avatar.state === 'dead' 
        || (entity.Avatar.state === 'respawning'
            && entity.Avatar.stateData.ticksSinceStartedRespawning === -1))) {
            deadPlayers.push(id)
        }

        if (entity.Avatar && entity.Avatar.state === 'respawning') {
            respawningPlayers.push(id)
        }
    }

    // move dead players to a spawn point
    for (const deadPlayer of deadPlayers) {
        const avatar = gameContext.entities[deadPlayer].Avatar
        const transform = gameContext.entities[deadPlayer].Transform
        const hitBox = gameContext.entities[deadPlayer].HitBox
        const spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)]
        const spawnTransform = gameContext.entities[spawnPoint].Transform
        transform.xPos = spawnTransform.xPos
        transform.yPos = spawnTransform.yPos
        transform.xVel = 0
        transform.yVel = 0
        hitBox.physicsEnabled = false
        avatar.state = 'respawning'
        avatar.stateData.ticksSinceStartedRespawning = 0

        if (avatar.stateData.firstSpawn) {
            avatar.stateData.firstSpawn = false
        } else {
            avatar.stateData.lives--
        }
    }

    for (const respawningPlayer of respawningPlayers) {
        const avatar = gameContext.entities[respawningPlayer].Avatar
        const hitBox = gameContext.entities[respawningPlayer].HitBox
        if (avatar.stateData.ticksSinceStartedRespawning >= ticksToRespawn) {
            avatar.state = 'alive'
            hitBox.physicsEnabled = true
        }
        avatar.stateData.ticksSinceStartedRespawning++
    }
}

module.exports = {
    physics,
    rps,
    tieBreaker,
    spawn
}