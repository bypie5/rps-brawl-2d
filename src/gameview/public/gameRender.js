import * as THREE from 'three'

async function _loadTileSheet (scene, url, tileWidth) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    const tilesheet = new Image()
    tilesheet.src = url

    // split the tilesheet into individual tiles and return them as an array of image urls
    const tiles = new Promise((resolve, reject) => {
        tilesheet.onload = async () => {
            canvas.width = tilesheet.width
            canvas.height = tilesheet.height
            context.drawImage(tilesheet, 0, 0)

            const tileRowCount = canvas.width / tileWidth
            const tileColumnCount = canvas.height / tileWidth
            const tiles = []

            for (let i = 0; i < tileColumnCount; i++) {
                for (let j = 0; j < tileRowCount; j++) {
                    const tileCanvasCopy = document.createElement('canvas')
                    const tileContext = tileCanvasCopy.getContext('2d')
                    tileCanvasCopy.width = tileWidth
                    tileCanvasCopy.height = tileWidth
                    tileContext.drawImage(canvas, j * tileWidth, i * tileWidth, tileWidth, tileWidth, 0, 0, tileWidth, tileWidth)

                    const blobUrls = new Promise((resolve, reject) => {
                        tileCanvasCopy.toBlob((blob) => {
                            if (!blob) {
                                reject()
                                return
                            }

                            const url = URL.createObjectURL(blob)
                            tiles.push(url)
                            resolve()
                        }, 'image/png')
                    })

                    await blobUrls
                }
            }

            resolve(tiles)
        }

        tilesheet.onerror = (err) => {
            reject(err)
        }
    })

    const spriteMaterials = []
    const imageDataUrls = await tiles
    for (let i = 0; i < imageDataUrls.length; i++) {
        const url = imageDataUrls[i]
        const map = new THREE.TextureLoader().load(url)
        const material = new THREE.SpriteMaterial({ map: map })

        spriteMaterials.push(material)
    }

    return spriteMaterials
}

function _buildBarrierEntity (spriteTile, components) {
    const sprite = new THREE.Sprite(spriteTile)
    sprite.scale.set(1, 1, 1)

    return sprite
}

class GameRender {
    constructor (canvas, sessionConfig) {
        if (!canvas) {
            throw new Error('No canvas provided')
        }

        if (!sessionConfig) {
            throw new Error('No session config provided')
        }

        this.sessionConfig = sessionConfig

        const windowWidth = window.innerWidth
        const windowHeight = window.innerHeight
        const aspectRatio = windowWidth / windowHeight
        const frustumSize = 20

        this.scene = new THREE.Scene()
        this.camera = new THREE.OrthographicCamera(frustumSize * aspectRatio/-2, frustumSize * aspectRatio/2, frustumSize/2, frustumSize/-2, -100, 1000)
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas })

        this.camera.position.z = 100

        this.renderer.setSize(windowWidth, windowHeight)

        this.isRendering = false

        // index of sprites in the tilesheet corresponds to the sprite' id - 1 (i.e. sprite id 1 is at index 0)
        this.spriteMaterials = _loadTileSheet(this.scene, 'assets/haunted_house.png', 64)
    }

    render () {
        this.renderer.render(this.scene, this.camera)
        if (this.isRendering) {
            let self = this
            requestAnimationFrame(() => {
                self.render()
            })
        }
    }

    onEntityAdded (entityId, entityComponents) {
        this._addEntityToScene(entityId, entityComponents)
    }

    onEntityRemoved (entityId) {
        this._removeEntityFromScene(entityId)
    }

    start () {
        this._loadLevel()
        this.isRendering = true
        this.render()
    }

    stop () {
        this.isRendering = false
    }

    async _loadLevel () {
        const { map } = this.sessionConfig

        let levelMapUri = null
        switch (map) {
            case 'map0':
                levelMapUri = 'assets/plane.json'
                break
            default:
                alert('Unknown map')
                console.log('Unknown map' + map)
                return
        }

        const levelData = await fetch(levelMapUri)

        if (!levelData) {
            throw new Error('Could not load level')
        }

        const levelMap = await levelData.json()
        const { layers } = levelMap
        const levelTiles = layers[0].data
        const spawnPoints = layers[1].data
    }

    _addEntityToScene (entityId, entityComponents) {
    }

    _removeEntityFromScene (entityId) {
    }
}

async function startRenderer (sessionConfig) {
    const canvas = document.getElementById('game-canvas')
    const gameRender = new GameRender(canvas, sessionConfig)

    gameRender.start()

    return gameRender
}

window.startRenderer = startRenderer
