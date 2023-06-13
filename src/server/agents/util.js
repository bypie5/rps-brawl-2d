function getGridCellNeighbors (centerGridKey) {
    const [x, y] = centerGridKey.split('_').map(Number)
    return [
        `${x - 1}_${y - 1}`,
        `${x}_${y - 1}`,
        `${x + 1}_${y - 1}`,
        `${x - 1}_${y}`,
        `${x + 1}_${y}`,
        `${x - 1}_${y + 1}`,
        `${x}_${y + 1}`,
        `${x + 1}_${y + 1}`
    ]
}

function computeGridKey (x, y, gridWidth) {
    return `${Math.floor(x / gridWidth)}_${Math.floor(y / gridWidth)}`
}

function getEntitiesInBox (entities, width, height, centerGridKey, gridWidth) {
    const entitiesInBox = []

    // compute box bounadries
    const [x, y] = centerGridKey.split('_').map(Number)
    const xMin = x - Math.floor(width / 2)
    const xMax = x + Math.floor(width / 2)
    const yMin = y - Math.floor(height / 2)
    const yMax = y + Math.floor(height / 2)

    // get all entities in box
    entities.forEach(([id, entity]) => {
        const entityGridKey = computeGridKey(entity.Transform.xPos, entity.Transform.yPos, gridWidth)
        const [entityX, entityY] = entityGridKey.split('_').map(Number)

        if (entityX >= xMin && entityX <= xMax && entityY >= yMin && entityY <= yMax) {
            entitiesInBox.push([id, entity])
        }
    })

    return entitiesInBox
}

function getNearestEntityByGridKey (entities, gridKey, gridWidth) {
    let minDist = Infinity
    let nearestEntity = null
    let nearestEntityId = null

    entities.forEach(([id, entity]) => {
        const entityGridKey = computeGridKey(entity.Transform.xPos, entity.Transform.yPos, gridWidth)
        const [entityX, entityY] = entityGridKey.split('_').map(Number)
        const [x, y] = gridKey.split('_').map(Number)

        const dist = Math.sqrt(Math.pow(entityX - x, 2) + Math.pow(entityY - y, 2))

        if (dist < minDist) {
            minDist = dist
            nearestEntity = entity
            nearestEntityId = id
        }
    })

    return [nearestEntityId, nearestEntity]
}

class MinPriorityQueue {
    constructor () {
        this.queue = []
    }

    enqueue (item, priority) {
        this.queue.push({ item, priority })
        this.queue.sort((a, b) => a.priority - b.priority)
    }

    dequeue () {
        return this.queue.shift()
    }

    peek () {
        return this.queue[0]
    }

    isEmpty () {
        return this.queue.length === 0
    }
}

function _buildNavGridKeyPair (startNavGridKey, targetNavGridKey) {
    return `${startNavGridKey}->${targetNavGridKey}`
}

function _getNavGridNeighbors(navGrid, navGridKey) {
    const [x, y] = navGridKey.split(',').map(Number)

    const neighbors = []
    for (let i = x - 1; i <= x + 1; i++) {
        for (let j = y - 1; j <= y + 1; j++) {
            const neighborKey = `${i},${j}`
            if (neighborKey !== navGridKey && navGrid.navigableTileKeys[neighborKey]) {
                neighbors.push(neighborKey)
            }
        }
    }

    return neighbors
}

function _getMovementCost (navGrid, startNavGridKey, targetNavGridKey) {
    if (startNavGridKey === targetNavGridKey) {
        return 0
    }

    const keyPair = _buildNavGridKeyPair(startNavGridKey, targetNavGridKey)
    const inverseKeyPair = _buildNavGridKeyPair(targetNavGridKey, startNavGridKey)

    if (navGrid.distanceMap[keyPair]) {
        return navGrid.distanceMap[keyPair]
    } else if (navGrid.distanceMap[inverseKeyPair]) {
        return navGrid.distanceMap[inverseKeyPair]
    } else {
        return Infinity
    }
}

function _reconstructPath (cameFrom, currentNavGridKey) {
    const totalPath = [currentNavGridKey]

    while (cameFrom[currentNavGridKey]) {
        currentNavGridKey = cameFrom[currentNavGridKey]
        totalPath.unshift(currentNavGridKey)
    }

    return totalPath
}

function computePathToTarget(navGrid, terrainTiles, startNavGridKey, targetNavGridKey) {
    // a* algorithm with perfect heuristic
    const open = new MinPriorityQueue()
    const cameFrom = {}

    const gScore = {}
    gScore[startNavGridKey] = 0
    for (const navGridKey of Object.keys(navGrid.navigableTileKeys)) {
        if (navGridKey !== startNavGridKey) {
            gScore[navGridKey] = Infinity
        }
    }

    const fScore = {}
    fScore[startNavGridKey] = _getMovementCost(navGrid, startNavGridKey, startNavGridKey)
    for (const navGridKey of Object.keys(navGrid.navigableTileKeys)) {
        if (navGridKey !== startNavGridKey) {
            fScore[navGridKey] = Infinity
        }
    }

    open.enqueue(startNavGridKey, fScore[startNavGridKey])

    while (!open.isEmpty()) {
        const { item: currentNavGridKey } = open.dequeue()

        if (currentNavGridKey === targetNavGridKey) {
            return _reconstructPath(cameFrom, currentNavGridKey)
        }

        const neighbors = _getNavGridNeighbors(navGrid, currentNavGridKey)
        for (const neighborNavGridKey of neighbors) {
            const tentativeGScore = gScore[currentNavGridKey] + _getMovementCost(navGrid, currentNavGridKey, neighborNavGridKey)

            if (tentativeGScore < gScore[neighborNavGridKey]) {
                cameFrom[neighborNavGridKey] = currentNavGridKey
                gScore[neighborNavGridKey] = tentativeGScore
                fScore[neighborNavGridKey] = gScore[neighborNavGridKey] + _getMovementCost(navGrid, neighborNavGridKey, targetNavGridKey)
                open.enqueue(neighborNavGridKey, fScore[neighborNavGridKey])
            }
        }
    }

    return []
}

function buildNavGridKey(x, y, gridWidth) {
    return `${Math.floor((x + gridWidth/2) / gridWidth)},${Math.floor((y + gridWidth/2) / gridWidth)}`
}

module.exports = {
    computeGridKey,
    getEntitiesInBox,
    getNearestEntityByGridKey,
    computePathToTarget,
    buildNavGridKey
}
