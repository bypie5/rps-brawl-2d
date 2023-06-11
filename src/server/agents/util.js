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

function computePathToTarget(entities, startGridKey, targetGridKey, gridWidth) {

}

module.exports = {
    computeGridKey,
    getEntitiesInBox,
    getNearestEntityByGridKey,
    computePathToTarget
}
