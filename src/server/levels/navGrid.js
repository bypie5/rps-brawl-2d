const fs = require('fs')
const crypto = require('crypto')

function buildGridKey (x, y) {
    return `${x},${y}`
}

/**
 * Determines the shortest distance between two navigable tiles.
 *
 * @param tile1 - { x, y, tileId, navigable, neighbors }
 * @param tile2 - { x, y, tileId, navigable, neighbors }
 * @param gridsInScene - { gridKey: { x, y, tileId, navigable, neighbors } }
 * @param levelInfo - { filePath, gridWidth, spawnTileId, barrierTileIds }
 * @returns {number} - The shortest distance between the two tiles.
 */
function shortestDistanceBetweenNavigablePairs (tile1, tile2, gridsInScene, levelInfo) {
    // breadth-first search
    const queue = []
    const visited = {}
    const distances = {}
    const previous = {}

    const startKey = buildGridKey(tile1.x, tile1.y)
    const endKey = buildGridKey(tile2.x, tile2.y)
    queue.push(startKey)
    visited[startKey] = true
    distances[startKey] = 0
    previous[startKey] = null

    while (queue.length > 0) {
        const currentKey = queue.shift()
        const current = gridsInScene[currentKey]
        if (currentKey === endKey) {
            break
        }
        for (const neighbor of current.neighbors) {
            const neighborKey = buildGridKey(neighbor.x, neighbor.y)
            if (!visited[neighborKey]) {
                visited[neighborKey] = true
                // euclidean distance
                distances[neighborKey] = distances[currentKey] + Math.sqrt(Math.pow(current.x - neighbor.x, 2) + Math.pow(current.y - neighbor.y, 2)) * levelInfo.gridWidth
                previous[neighborKey] = currentKey
                queue.push(neighborKey)
            }
        }
    }

    return distances[endKey]
}

function computeNeighbors (tileInfo) {
    const grids = {}
    for (const tile of tileInfo) {
        const key = buildGridKey(tile.x, tile.y)
        grids[key] = tile
    }

    for (const tile of tileInfo) {
        const neighbors = []
        const neighborKeys = [
            buildGridKey(tile.x - 1, tile.y),
            buildGridKey(tile.x + 1, tile.y),
            buildGridKey(tile.x, tile.y - 1),
            buildGridKey(tile.x, tile.y + 1),
            buildGridKey(tile.x - 1, tile.y - 1),
            buildGridKey(tile.x + 1, tile.y - 1),
            buildGridKey(tile.x - 1, tile.y + 1),
            buildGridKey(tile.x + 1, tile.y + 1),
        ]
        for (const neighborKey of neighborKeys) {
            if (grids[neighborKey] && grids[neighborKey].navigable) {
                neighbors.push(grids[neighborKey])
            }
        }
        tile.neighbors = neighbors
    }

    return grids
}

function shortestDistanceBetweenAllNavigableTiles (tileInfo, levelInfo) {
    const gridsInScene = computeNeighbors(tileInfo)
    const navigableTiles = tileInfo.filter(tile => tile.navigable)
    const distanceMap = {}
    for (const tile1 of navigableTiles) {
        for (const tile2 of navigableTiles) {
            if (tile1 === tile2) {
                continue
            }

            const key = `${buildGridKey(tile1.x, tile1.y)}->${buildGridKey(tile2.x, tile2.y)}`
            const reverseKey = `${buildGridKey(tile2.x, tile2.y)}->${buildGridKey(tile1.x, tile1.y)}`
            if (distanceMap[reverseKey] || distanceMap[key]) {
                continue
            }

            distanceMap[key] = shortestDistanceBetweenNavigablePairs(tile1, tile2, gridsInScene, levelInfo)
        }
    }
    return distanceMap
}

function createTileInfo (mapTileTypes, levelInfo, levelWidth, levelHeight) {
    const tileInfo = []
    for (let y = 0; y > -levelHeight; y--) {
        for (let x = 0; x < levelWidth; x++) {
            const tileIndex = (Math.abs(y) * levelWidth) + x
            const tileId = mapTileTypes[tileIndex]
            if (levelInfo.barrierTileIds.includes(tileId)) {
                tileInfo.push({x, y, tileId, navigable: false, neighbors: []})
            } else {
                tileInfo.push({x, y, tileId, navigable: true, neighbors: []})
            }
        }
    }
    return tileInfo
}

function generateNavGridFile (distanceMap, filePath, checksum) {
    const navGrid = {
        distanceMap,
        checksum,
        generatedAt: Date.now()
    }

    const navGridStr = JSON.stringify(navGrid)
    const navGridFilePath = filePath.replace('.json', '_navGrid.json')
    fs.writeFileSync(navGridFilePath, navGridStr)

    console.log(`Generated nav grid for ${filePath}`)
}

function getNavGrid (filePath) {
    const navGridFilePath = filePath.replace('.json', '_navGrid.json')
    if (!fs.existsSync(navGridFilePath)) {
        return null
    }

    const navGridStr = fs.readFileSync(navGridFilePath)
    return JSON.parse(navGridStr)
}

function generateNavGrid (levelInfo) {
    for (const info of levelInfo) {
        const filePath = info.filePath
        const tileDataStr = fs.readFileSync(filePath)
        const tileDataChecksum = crypto.createHash('md5').update(tileDataStr).digest('hex')
        const tileData = JSON.parse(tileDataStr)
        const mapTileTypes = tileData.layers[0].data
        const levelWidth = tileData.width
        const levelHeight = tileData.height

        // does nav grid exist?
        const navGrid = getNavGrid(filePath)
        if (navGrid && navGrid.checksum === tileDataChecksum) {
            continue
        }

        // if not, generate it
        const tileInfo = createTileInfo(mapTileTypes, info, levelWidth, levelHeight)
        const distances = shortestDistanceBetweenAllNavigableTiles(tileInfo, info)

        generateNavGridFile(distances, filePath, tileDataChecksum)
    }
}

module.exports = generateNavGrid
