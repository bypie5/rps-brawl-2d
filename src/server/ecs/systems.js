const {
    rpsCompare,
    replaceCollisionsWithOtherPlayersSet,
    resolveClusterMembers,
    createTieBreakerBracket,
    midMatchTieBreakerFSM,
    findEntityCenterOfCluster,
    randomRange
} = require('./util')

const {
    buildTieBreakerManagerEntity,
    buildPowerUpEntity,
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

    if (player1.Avatar.state !== 'alive' || player2.Avatar.state !== 'alive') {
        return
    }

    const result = rpsCompare(player1Rps, player2Rps)

    if (result === 1) {
        player2.Avatar.state = 'dead'
    } else if (result === -1) {
        player1.Avatar.state = 'dead'
    }
}

function getEntitiesByLogicalKey (entities, gridWidth) {
    const entitiesByLogicalKey = new Map()
    for (const [id, entity] of Object.entries(entities)) {
        if (entity.Transform) {
            const key = determineLogicalKey(entity.Transform.xPos, entity.Transform.yPos, gridWidth)
            if (!entitiesByLogicalKey.has(key)) {
                entitiesByLogicalKey.set(key, [])
            }
            entitiesByLogicalKey.get(key).push(id)
        }
    }

    return entitiesByLogicalKey
}

function physics (gameContext, session, systemContext) {
    const entitiesByLogicalKey = getEntitiesByLogicalKey(gameContext.entities, gameContext.gridWidth)

    // update positions based on velocity
    const dt = deltaTimeSeconds(gameContext)
    for (const [id, entity] of Object.entries(gameContext.entities)) {
        if (entity.Transform && entity.Avatar) {
            const transform = entity.Transform
            if (entity.HitBox.physicsEnabled) {
                transform.xPos += transform.xVel * dt
                transform.yPos += transform.yVel * dt
            } else {
                transform.xVel = 0
                transform.yVel = 0
            }

            const collisions = detectCollision(gameContext, entitiesByLogicalKey, entity, id)
            if (collisions.length === 0) {
                // no collisions, so we can just move on
                replaceCollisionsWithOtherPlayersSet(entity, [])
                continue
            }

            // there are collisions, so we need to resolve them

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
            } else {
                replaceCollisionsWithOtherPlayersSet(entity, [])
            }
        }
    }
}

function powerups (gameContext, session, systemContext) {
    // this system should do nothing until initialDelay has passed
    if (systemContext.initialDelay > 0) {
        systemContext.initialDelay--
        return
    }

    // manage power ups that are already in the scene
    const idsToRemove = []
    for (const id of systemContext.idsOfSpawnedPowerups.entries()) {
        const effectiveId = id[0]
        const entity = gameContext.entities[effectiveId]
        if (!entity.PowerUp) {
            continue
        }

        if (entity.PowerUp.ticksSinceCreated < systemContext.timeToLivePowerupTicks) {
            entity.PowerUp.ticksSinceCreated++
        } else {
            idsToRemove.push(effectiveId)
        }
    }

    // remove power ups that have expired from scene and system context
    for (const id of idsToRemove) {
        session.removeEntity(id)
        systemContext.idsOfSpawnedPowerups.delete(id)
    }

    if (systemContext.ticksBetweenPowerupSpawns > 0) {
        // we're not ready to spawn a powerup yet
        systemContext.ticksBetweenPowerupSpawns--
        return
    }

    // pick a location to spawn next power up
    const entitiesByLogicalKey = getEntitiesByLogicalKey(gameContext.entities, gameContext.gridWidth)
    const openTerrainTiles = session.map.getTerrainTiles()
        .filter(tile => {
            const key = determineLogicalKey(tile.x, tile.y, gameContext.gridWidth)

            let isOccupied = false
            const entitiesAtLocation = entitiesByLogicalKey.get(key)
            if (!entitiesAtLocation) {
                return false
            }

            for (const id of entitiesAtLocation) {
                const entity = gameContext.entities[id]
                if (entity && !entity.Terrain) {
                    isOccupied = true
                    break
                }
            }

            return !isOccupied
        })

    const randomIndex = Math.floor(Math.random() * openTerrainTiles.length)
    const tile = openTerrainTiles[randomIndex]
    // spawn power up at location
    const randomPowerUp = (() => {
      const randomPowerUpIndex = Math.floor(Math.random() * systemContext.supportedPowerups.length)
      return systemContext.supportedPowerups[randomPowerUpIndex]
    })()
    const powerUp = buildPowerUpEntity(randomPowerUp, tile.x, tile.y)
    const entityId = session.instantiateEntity(powerUp)
    systemContext.idsOfSpawnedPowerups.add(entityId)
    systemContext.ticksBetweenPowerupSpawns = randomRange(
      systemContext.minTicksBetweenPowerupSpawns,
      systemContext.maxTicksBetweenPowerupSpawns
    )
}

function rps (gameContext, session, systemContext) {
    const createdRpsMatches = new Set()
    for (const [id, entity] of Object.entries(gameContext.entities)) {
        if (entity.Avatar
            && entity.Avatar.state === 'alive'
            && entity.Avatar.stateData.collisionsWithOtherPlayers.length > 0) {
            // pick a random player to challenge
            const otherPlayerId = entity.Avatar.stateData.collisionsWithOtherPlayers[
                Math.floor(Math.random() * entity.Avatar.stateData.collisionsWithOtherPlayers.length)
            ]
            doRegularRpsMatch(entity, gameContext.entities[otherPlayerId])

            // const membersInCluster = resolveClusterMembers(entity, id, gameContext)
            // if (membersInCluster.length == 2) {
            //     // 2 players in cluster (regular collision)
            //     const player1 = gameContext.entities[membersInCluster[0]]
            //     const player2 = gameContext.entities[membersInCluster[1]]
            //     doRegularRpsMatch(player1, player2)
            // } else if (membersInCluster.length > 2) {
                // cluster collision - must resolve ambiguity

                // does a tie breaker match already exist?
                /*for (const id of membersInCluster) {
                    const entity = gameContext.entities[id]
                    if (entity.Avatar.state === 'breakingtie') {
                        // tie breaker match already exists
                        return
                    }
                }

                // 1. disable physics for all players in cluster
                for (const id of membersInCluster) {
                    gameContext.entities[id].Avatar.state = 'breakingtie'
                    gameContext.entities[id].Transform.xVel = 0
                    gameContext.entities[id].Transform.yVel = 0
                    gameContext.entities[id].HitBox.physicsEnabled = false
                }

                // 2. create tie breaker match manager
                console.log('tie breaker match' + membersInCluster)
                const { closestEntityId } = findEntityCenterOfCluster(membersInCluster, gameContext)
                const { xPos, yPos } = gameContext.entities[closestEntityId].Transform
                const tieBreakerMatchManager = buildTieBreakerManagerEntity(membersInCluster, gameContext.currentTick, xPos, yPos)
                session.instantiateEntity(tieBreakerMatchManager)

                createdRpsMatches.add(tieBreakerMatchManager)*/
            //}
        }

        if (entity.Avatar 
            && entity.Avatar.stateData.stateSwitchCooldownTicks > 0) {
            entity.Avatar.stateData.stateSwitchCooldownTicks--
        }
    }
}

function tieBreaker (gameContext, session, systemContext) {
    for (const [id, entity] of Object.entries(gameContext.entities)) {
        if (entity.TieBreaker
            && !entity.TieBreaker.tournamentBracket) {
            entity.TieBreaker.tournamentBracket = createTieBreakerBracket(entity.TieBreaker.idsOfCohortMembers)
        }

        if (entity.TieBreaker
            && entity.TieBreaker.tournamentBracket) {
                midMatchTieBreakerFSM(entity, gameContext, (winner) => {
                    for (const id of entity.TieBreaker.idsOfCohortMembers) {
                        const participant = gameContext.entities[id]
                        if (participant.Avatar.state === 'breakingtie' && id === winner) {
                            participant.Avatar.state = 'alive'
                            participant.Avatar.stateData.lives++
                            participant.HitBox.physicsEnabled = true
                        }

                        if (participant.Avatar.state === 'breakingtie' && id !== winner) {
                            participant.Avatar.state = 'dead'
                        }
                    }

                    session.removeEntity(id)
                })
        }
    }
}

function spawn (gameContext, session, systemContext) {
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
            || entity.Avatar.stateData.firstSpawn)) {
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

        if (avatar.stateData.firstSpawn && session.config.initialSpawnLocations) {
            for (const customPlayerSpawnLocation of session.config.initialSpawnLocations) {
                if (customPlayerSpawnLocation.playerId === avatar.playerId) {
                    transform.xPos = customPlayerSpawnLocation.xPos
                    transform.yPos = customPlayerSpawnLocation.yPos
                }
            }
        }
        if (avatar.stateData.firstSpawn) {
            avatar.stateData.firstSpawn = false
        } else {
            avatar.stateData.lives--
        }

        if (avatar.stateData.lives <= 0) {
            avatar.state = 'spectating'
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
    powerups,
    tieBreaker,
    spawn
}