const fs = require('fs')

class LevelDescription {
    constructor (tileMap, gridWidth, spawnPointId) {
        this.tileMap = tileMap
        this.gridWidth = gridWidth
        this.spawnPointId = spawnPointId

        const data = fs.readFileSync(tileMap)
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


module.exports = {
    levelZero: () => {
        return new LevelDescription('./src/resources/plane.json', 5, 26)
    }
}
