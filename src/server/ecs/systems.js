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

function physics (gameContext) {
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
            }
        }
    }
}

function rps (gameContext) {
    for (const [id, entity] of Object.entries(gameContext.entities)) {
        if (entity.Avatar 
            && entity.Avatar.stateData.stateSwitchCooldownTicks > 0) {
            entity.Avatar.stateData.stateSwitchCooldownTicks--
        }
    }
}

function spawn (gameContext) {
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
        || (entity.Avatar.state === 'respawning' && entity.Avatar.stateData.ticksSinceStartedRespawning === -1))) {
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
        const spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)]
        const spawnTransform = gameContext.entities[spawnPoint].Transform
        transform.xPos = spawnTransform.xPos
        transform.yPos = spawnTransform.yPos
        avatar.state = 'respawning'
        avatar.stateData.ticksSinceStartedRespawning = 0
    }

    for (const respawningPlayer of respawningPlayers) {
        const avatar = gameContext.entities[respawningPlayer].Avatar
        if (avatar.stateData.ticksSinceStartedRespawning >= ticksToRespawn) {
            avatar.state = 'alive'
        }
        avatar.stateData.ticksSinceStartedRespawning++
    }
}

module.exports = {
    physics,
    rps,
    spawn
}