const fs = require('fs')

const { generateNavGrid } = require('./navGrid')
const logger = require('../util/logger')

const levelInfo = [
    {
        filePath: './src/resources/plane.json',
        gridWidth: 5,
        spawnTileId: 26,
        barrierTileIds: [2, 3]
    },
    {
        filePath: './src/resources/plane_obstacles.json',
        gridWidth: 5,
        spawnTileId: 26,
        barrierTileIds: [2, 3]
    }
]

function mapCodeToLevelFilePath (code) {
    switch (code) {
        case "map0":
            return levelInfo[0].filePath
        case "map1":
            return levelInfo[1].filePath
        default:
            throw new Error(`Unknown map code: ${code}`)
    }
}

function preComputeDistances () {
    const now = Date.now()
    logger.info('precomputing distance for levels...')
    generateNavGrid(levelInfo)
    logger.info(`done precomputing distances in ${Date.now() - now}ms`)
}

class LevelDescription {
    constructor (tileMap, gridWidth, spawnPointId, barrierTileIds) {
        this.tileMap = tileMap
        this.gridWidth = gridWidth
        this.spawnPointId = spawnPointId
        this.barrierTileIds = barrierTileIds

        const data = fs.readFileSync(this.tileMap)
        this.tileMapData = JSON.parse(data)

        this.width = this.tileMapData.width
        this.height = this.tileMapData.height

        this.spawnPoints = this._defineSpawnPoints()
    }

    getDimensions () {
        return { width: this.width, height: this.height }
    }

    getSpawnPoints () {
        return this.spawnPoints
    }

    getGridWidth () {
        return this.gridWidth
    }

    findBarrierTiles (onTileFound) {
        const layer1 = this.tileMapData.layers[0]
        const tileData = layer1.data

        for (let y = 0; y > -this.height; y--) {
            for (let x = 0; x < this.width; x++) {
                const tileIndex = (Math.abs(y) * this.width) + x
                const tileId = tileData[tileIndex]
                if (this.barrierTileIds.includes(tileId)) {
                    const xPos = x * this.gridWidth
                    const yPos = y * this.gridWidth
                    onTileFound(xPos, yPos, tileId)
                }
            }
        }
    }

    findTerrainTiles (onTileFound) {
        const layer1 = this.tileMapData.layers[0]
        const tileData = layer1.data

        for (let y = 0; y > -this.height; y--) {
            for (let x = 0; x < this.width; x++) {
                const tileIndex = (Math.abs(y) * this.width) + x
                const tileId = tileData[tileIndex]
                if (!this.barrierTileIds.includes(tileId)) {
                    const xPos = x * this.gridWidth
                    const yPos = y * this.gridWidth
                    onTileFound(xPos, yPos, tileId)
                }
            }
        }
    }

    getTerrainTiles () {
        const tiles = []
        this.findTerrainTiles((x, y, tileId) => {
            tiles.push({ x, y, tileId })
        })

        return tiles
    }

    _defineSpawnPoints () {
        // by convention. layer 1 contains spawn point locations
        const layer2 = this.tileMapData.layers[1]
        const tileData = layer2.data

        const spawnPoints = []
        // x values are columns, y values are rows
        // y starts at 0 and decreases as you go down
        for (let y = 0; y > -this.height; y--) {
            for (let x = 0; x < this.width; x++) {
                const tileIndex = (Math.abs(y) * this.width) + x
                const tileId = tileData[tileIndex]
                if (tileId === this.spawnPointId) {
                    const xPos = x * this.gridWidth
                    const yPos = y * this.gridWidth                
                    spawnPoints.push({ x: xPos, y: yPos })
                }
            }
        }
        
        return spawnPoints
    }
}


module.exports = {
    mapCodeToLevelFilePath,
    preComputeDistances,
    levelZero: () => {
        const filePath = levelInfo[0].filePath
        const gridWidth = levelInfo[0].gridWidth
        const spawnTileId = levelInfo[0].spawnTileId
        const barrierTileIds = levelInfo[0].barrierTileIds
        return new LevelDescription(filePath, gridWidth, spawnTileId, barrierTileIds)
    },
    levelOne: () => {
        const filePath = levelInfo[1].filePath
        const gridWidth = levelInfo[1].gridWidth
        const spawnTileId = levelInfo[1].spawnTileId
        const barrierTileIds = levelInfo[1].barrierTileIds
        return new LevelDescription(filePath, gridWidth, spawnTileId, barrierTileIds)
    }
}
