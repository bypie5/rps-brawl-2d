const fs = require('fs')

class LevelDescription {
    constructor (height, width, tileMap, spawnPointId) {
        this.height = height
        this.width = width
        this.tileMap = tileMap
        this.spawnPointId = spawnPointId

        const data = fs.readFileSync(tileMap)
        this.tileMapData = JSON.parse(data)

        this.spawnPoints = this._defineSpawnPoints()
    }

    getSpawnPoints () {
        return this.spawnPoints
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
                    spawnPoints.push({ x: x, y: y })
                }
            }
        }
        
        return spawnPoints
    }
}

const simplePlane = new LevelDescription(15, 15, './src/resources/plane.json', 26)

//module.exports = LevelDescription
