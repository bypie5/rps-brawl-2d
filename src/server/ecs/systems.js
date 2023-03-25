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

    return neighbors
}

function detectCollision (gameContext, entitiesByLogicalKey, entity, playerId) {
    const entityKey = determineLogicalKey(entity.Transform.xPos, entity.Transform.yPos, gameContext.gridWidth)
    const neighborsKeys = computeNeighborsOfGrid(entityKey)

    function _isColliding (entity1, entity2) {
        const x1 = entity1.Transform.xPos
        const y1 = entity1.Transform.yPos
        const x2 = entity2.Transform.xPos
        const y2 = entity2.Transform.yPos
        if (!entity1.HitBox || !entity2.HitBox) {
            return false
        }

        const h1 = entity1.HitBox.size
        const h2 = entity2.HitBox.size

        const height1 = h1 / 2
        const height2 = h2 / 2
        const width1 = h1 / 2
        const width2 = h2 / 2

        if (
            x1 < x2 + width2 &&
            x1 + width1 > x2 &&
            y1 < y2 + height2 &&
            y1 + height1 > y2
        ) {
            console.log(`x1 < x2 + width2: ${x1} < ${x2 + width2}`)
            console.log(`x1 + width1 > x2: ${x1 + width1} > ${x2}`)
            console.log(`y1 < y2 + height2: ${y1} < ${y2 + height2}`)
            console.log(`y1 + height1 > y2: ${y1 + height1} > ${y2}`)
            return true
        }
        return false
    }

    const collisions = []
    for (const key of neighborsKeys) {
        if (!entitiesByLogicalKey.has(key)) {
            continue
        }

        for (const id of entitiesByLogicalKey.get(key)) {
            if (id !== playerId && _isColliding(gameContext.entities[id], entity)) {
                collisions.push(id)
                console.log(gameContext.entities[id])
            }
        }
    }

    return collisions
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
            const speedMultiplier = entity.Avatar.speed
            let sm = 1
            switch (speedMultiplier) {
                case 0:
                    sm = 0
                    break
                case 1:
                    sm = 2.5
                    break
                case 2:
                    sm = 4
                    break
                default:
                    sm = 1
                    break
            }

            const transform = entity.Transform
            transform.xPos += transform.xVel * dt * sm
            transform.yPos += transform.yVel * dt * sm

            const collisions = detectCollision(gameContext, entitiesByLogicalKey, entity, id)
            if (collisions.length > 0) {
                // handle collisions by moving player to be just outside of the collision.
               
                // player should be moved in the opposite direction of their velocity
                // by an an amount that places them just outside of the collision
                
                console.log('collision detected: ' + collisions)

                console.log(-transform.xVel * dt * sm)
                console.log(-transform.yVel * dt * sm)
                transform.xPos -= transform.xVel * dt * sm
                transform.yPos -= transform.yVel * dt * sm
            }
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
    spawn
}