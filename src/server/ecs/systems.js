function deltaTimeSeconds (gameContext) {
    return gameContext.deltaTime / 1000
}

function physics (gameContext) {
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