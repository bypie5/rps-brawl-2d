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

function _buildSpriteEntity (spriteTile, components) {
    const { HitBox, Transform } = components
    const sprite = new THREE.Sprite(spriteTile)
    sprite.scale.set(HitBox.width, HitBox.height, 1)

    sprite.position.x = Transform.xPos
    sprite.position.y = Transform.yPos

    return sprite
}

function _getRpsSpriteMaterial (rpsState) {
    let spriteAvatarUri = null
    switch (rpsState) {
        case 'rock':
            spriteAvatarUri = 'assets/rock_avatar.png'
            break
        case 'paper':
            spriteAvatarUri = 'assets/paper_avatar.png'
            break
        case 'scissors':
            spriteAvatarUri = 'assets/scissors_avatar.png'
            break
        default:
            throw new Error('Invalid rock paper scissors state')
    }

    const spriteTile = new THREE.TextureLoader().load(spriteAvatarUri)
    const spriteMaterial = new THREE.SpriteMaterial({ map: spriteTile })
    spriteMaterial.name = rpsState
    return spriteMaterial
}

function _buildPlayerEntity (components) {
    const { Avatar, HitBox, Transform } = components

    const spriteMaterial = _getRpsSpriteMaterial(Avatar.stateData.rockPaperScissors)
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(HitBox.width, HitBox.width, 1)

    sprite.position.x = Transform.xPos
    sprite.position.y = Transform.yPos

    return sprite
}

class GameRender {
    constructor (canvas, sessionConfig, username, sessionInfo) {
        if (!canvas) {
            throw new Error('No canvas provided')
        }

        if (!sessionConfig) {
            throw new Error('No session config provided')
        }

        if (!username) {
            throw new Error('No username provided')
        }

        if (!sessionInfo) {
            throw new Error('No session info provided')
        }

        this.sessionConfig = sessionConfig
        this.username = username
        this.sessionInfo = sessionInfo

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
        this.latestTickRendered = -1
        this.latestTickReceived = -1

        this.entityIdThreeJsIdMap = new Map()
        this.playersAvatarId = null
        this.uiElements = {
            playerUi: null,
            tieBreakerUi: null
        }

        // index of sprites in the tilesheet corresponds to the sprite' id - 1 (i.e. sprite id 1 is at index 0)
        _loadTileSheet(this.scene, 'assets/haunted_house.png', 64).then((spriteMaterials) => {
            this.spriteMaterials = spriteMaterials
        })
    }

    render () {
        this.latestTickReceived = this.sessionInfo.latestReceivedGameStateTick
        if (this.latestTickRendered === this.latestTickReceived && this.latestTickRendered !== -1 && this.latestTickReceived !== -1) {
            // no new game state to render
            let self = this
            requestAnimationFrame(() => {
                self.render()
            })
            return
        }


        if (this.isRendering) {
            // update the camera position to follow the player
            if (this.playersAvatarId) {
                const playerEntity = this.scene.getObjectById(this.playersAvatarId)
                if (playerEntity) {
                    const playerPosition = playerEntity.position

                    this.camera.position.x = playerPosition.x
                    this.camera.position.y = playerPosition.y
                }
            }
            this.latestTickRendered = this.latestTickReceived
            this.renderer.render(this.scene, this.camera)
            window.gameUiManager.update()

            let self = this
            requestAnimationFrame(() => {
                self.render()
            })
        }
    }

    isEntityInScene (entityId) {
        return this.entityIdThreeJsIdMap.has(entityId)
    }

    onEntityAdded (entityId, entityComponents, entitiesInScene) {
        try {
            return this._addEntityToScene(entityId, entityComponents, entitiesInScene)
        } catch (err) {
            console.log(err)
        }
    }

    onEntityUpdated (entityId, entityComponents, entitiesInScene, latestReceivedGameStateTick) {
        try {
            if (this.latestTickReceived < latestReceivedGameStateTick) {
                this.latestTickReceived = latestReceivedGameStateTick
            }

            this._updateEntityInScene(entityId, entityComponents, entitiesInScene)
        } catch (err) {
            console.log(err)
        }
    }

    onEntityRemoved (entityId, entityComponents, entitiesInScene) {
        this._removeEntityFromScene(entityId, entityComponents, entitiesInScene)
    }

    start () {
        this.isRendering = true
        this.render()
    }

    stop () {
        this.isRendering = false
    }

    _addEntityToScene (entityId, entityComponents, entitiesInScene) {
        if (this.isEntityInScene(entityId)) {
            return
        }

        if (!this.spriteMaterials) {
            return
        }

        let threeJsId = null
        if (entityComponents.Barrier && entityComponents.Transform && entityComponents.HitBox) {
            const spriteId = Number(entityComponents.Barrier.spriteId)
            const spriteTile = this.spriteMaterials[spriteId - 1]
            const barrier = _buildSpriteEntity(spriteTile, entityComponents)
            this.scene.add(barrier)
            this.entityIdThreeJsIdMap.set(entityId, barrier.id)
            threeJsId = barrier.id
        } else if (entityComponents.Terrain && entityComponents.Transform && entityComponents.HitBox) {
            const spriteId = Number(entityComponents.Terrain.spriteId)
            const spriteTile = this.spriteMaterials[spriteId - 1]
            const terrain = _buildSpriteEntity(spriteTile, entityComponents)
            this.scene.add(terrain)
            this.entityIdThreeJsIdMap.set(entityId, terrain.id)
            threeJsId = terrain.id
        } else if (entityComponents.Avatar && entityComponents.Transform && entityComponents.HitBox) {
            const avatar = _buildPlayerEntity(entityComponents)
            this.scene.add(avatar)
            this.entityIdThreeJsIdMap.set(entityId, avatar.id)
            threeJsId = avatar.id

            if (entityComponents.Avatar && entityComponents.Avatar.playerId === this.username) {
                this.playersAvatarId = avatar.id

                this.uiElements.playerUi = window.gameUiManager.addComponentToScene('hudOverlay', {
                    playerId: this.username,
                    lives: entityComponents.Avatar.stateData.lives,
                })
            }
        } else if (
          entityComponents.TieBreaker
          && Object.entries(entitiesInScene)
            .filter(([entityId, components]) => {
                return entityComponents.TieBreaker.idsOfCohortMembers.includes(entityId)
            })
            .find(([entityId, components]) => {
                return components.Avatar && components.Avatar.playerId === this.username
            })
        ) {
            this.uiElements.tieBreakerUi = window.gameUiManager.addComponentToScene('tieBreakerView', {
                tieBreakerState: entityComponents.TieBreaker.tieBreakerState,
                tieBreakerBracket: entityComponents.TieBreaker.tournamentBracket,
                entitiesOfPlayersInTournament: Object.entries(entitiesInScene)
                    .filter(([entityId, components]) => {
                      return entityComponents.TieBreaker.idsOfCohortMembers.includes(entityId)
                    }),
                usernameOfPlayer: this.username
            })

            threeJsId = 'tieBreakerUi' // can't use the entity id because it's not in the scene
            this.entityIdThreeJsIdMap.set(entityId, threeJsId)
        }

        return threeJsId
    }

    _updateEntityInScene (entityId, entityComponents, entitiesInScene) {
        if (!this.isEntityInScene(entityId)) {
            return
        }

        const threeJsId = this.entityIdThreeJsIdMap.get(entityId)

        // update "mock" three.js entities here
        if (entityComponents.TieBreaker
          && Object.entries(entitiesInScene)
            .filter(([entityId, components]) => {
                return entityComponents.TieBreaker.idsOfCohortMembers.includes(entityId)
            })
            .find(([entityId, components]) => {
                return components.Avatar && components.Avatar.playerId === this.username
            })
          && this.uiElements.tieBreakerUi) {
            window.gameUiManager.updateComponent(this.uiElements.tieBreakerUi, {
                tieBreakerState: entityComponents.TieBreaker.tieBreakerState,
                tieBreakerBracket: entityComponents.TieBreaker.tournamentBracket,
                entitiesOfPlayersInTournament: Object.entries(entitiesInScene)
                  .filter(([entityId, components]) => {
                      return entityComponents.TieBreaker.idsOfCohortMembers.includes(entityId)
                  })
            })
        }

        const entity = this.scene.getObjectById(threeJsId)
        if (!entity) {
            return
        }

        // real three.js entities are updated below
        if (entityComponents.Transform) {
            // translate to the new position
            entity.position.x = entityComponents.Transform.xPos
            entity.position.y = entityComponents.Transform.yPos
        }

        if (entityComponents.Avatar
            && entityComponents.Avatar.state === 'alive'
        ) {
            entity.visible = true
        } else if ((entityComponents.Avatar
            && entityComponents.Avatar.state !== 'alive')) {
            entity.visible = false
        }

        if (entityComponents.Avatar
            && entity.material.name !== entityComponents.Avatar.stateData.rockPaperScissors) {
            const newMaterial = _getRpsSpriteMaterial(entityComponents.Avatar.stateData.rockPaperScissors)
            entity.material = newMaterial
        }

        if (entityComponents.Avatar
            && entityComponents.Avatar.playerId === this.username
            && entityComponents.Transform
            && this.uiElements.playerUi) {
            window.gameUiManager.updateComponent(this.uiElements.playerUi, {
                lives: entityComponents.Avatar.stateData.lives,
            })
        }
    }

    _removeEntityFromScene (entityId, entityComponents, entitiesInScene) {
        if (!this.isEntityInScene(entityId)) {
            return
        }

        const threeJsId = this.entityIdThreeJsIdMap.get(entityId)

        if (entityComponents.TieBreaker) {
            entityComponents.TieBreaker.idsOfCohortMembers.forEach((id) => {
                  const entity = entitiesInScene[id]
                  if (entity && entity.Avatar && entity.Avatar.playerId === this.username) {
                      window.gameUiManager.removeComponentFromScene(this.uiElements.tieBreakerUi)
                  }
              }
            )
        }
    }
}

async function startRenderer (sessionConfig, username, sessionInfo) {
    const canvas = document.getElementById('game-canvas')
    const gameRender = new GameRender(canvas, sessionConfig, username, sessionInfo)

    gameRender.start()

    window.gameUiManager.start()

    return gameRender
}

window.startRenderer = startRenderer
