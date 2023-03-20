const fs = require('fs')

class LevelDescription {
    constructor (height, width, tileMap) {
        this.height = height
        this.width = width
        this.tileMap = tileMap

        const data = fs.readFileSync(tileMap)
        this.tileMapData = JSON.parse(data)

        this.spawnPoints = this._defineSpawnPoints()
    }

    _defineSpawnPoints () {
        // by convention. layer 1 contains spawn point locations
        const layer2 = this.tileMapData.layers[1]
        console.log(layer2)
        return []
    }
}

const simplePlane = new LevelDescription(15, 15, './src/resources/plane.json')

//module.exports = LevelDescription
