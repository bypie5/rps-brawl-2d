import { SpriteMixer } from './lib/SpriteMixer.js'
import { buildHourglassIndicator } from './components/animated/hourglassIndicator.js'
import { nearestToAspectRatio } from './util.js'

function _buildAssetUrl (assetName) {
    if (window.isExternalClient) {
        return `${window.resourcePath}/${assetName}`
    } else {
        return assetName
    }
}

async function _loadTileSheet (scene, url, tileWidth) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    const tilesheet = new Image()
    tilesheet.src = url
    tilesheet.setAttribute('crossOrigin', 'anonymous')

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
        const map = new window.THREE.TextureLoader().load(url)
        map.anisotropy = 16
        map.magFilter = window.THREE.NearestFilter
        const material = new window.THREE.SpriteMaterial({ map: map })

        spriteMaterials.push(material)
    }

    return spriteMaterials
}

function _buildSpriteEntity (spriteTile, components) {
    const { HitBox, Transform } = components
    const sprite = new window.THREE.Sprite(spriteTile)
    sprite.scale.set(HitBox.width, HitBox.height, 1)

    sprite.position.x = Transform.xPos
    sprite.position.y = Transform.yPos

    return sprite
}

function _getRpsSpriteMaterial (rpsState) {
    let spriteAvatarUri = null
    switch (rpsState) {
        case 'rock':
            spriteAvatarUri = _buildAssetUrl('assets/rock_avatar.png')
            break
        case 'paper':
            spriteAvatarUri = _buildAssetUrl('assets/paper_avatar.png')
            break
        case 'scissors':
            spriteAvatarUri = _buildAssetUrl('assets/scissors_avatar.png')
            break
        default:
            throw new Error('Invalid rock paper scissors state')
    }

    const spriteTile = new window.THREE.TextureLoader().load(spriteAvatarUri)
    const spriteMaterial = new window.THREE.SpriteMaterial({ map: spriteTile })
    spriteMaterial.name = rpsState
    return spriteMaterial
}

function _buildPlayerEntity (components, hourglassIndicator) {
    const { Avatar, HitBox, Transform } = components

    const spriteMaterial = _getRpsSpriteMaterial(Avatar.stateData.rockPaperScissors)
    const sprite = new window.THREE.Sprite(spriteMaterial)
    sprite.scale.set(HitBox.width, HitBox.height, 1)

    sprite.position.x = Transform.xPos
    sprite.position.y = Transform.yPos

    // add power up status icons
    const shieldPowerUpImageUrl = _buildAssetUrl('assets/shield_powerup.png')
    const shieldPowerUpSpriteTile = new window.THREE.TextureLoader().load(shieldPowerUpImageUrl)
    const shieldPowerUpSpriteMaterial = new window.THREE.SpriteMaterial({ map: shieldPowerUpSpriteTile })
    const shieldPowerUpSprite = new window.THREE.Sprite(shieldPowerUpSpriteMaterial)
    shieldPowerUpSprite.scale.set((HitBox.width * 0.5) * 1.1, (HitBox.height * 1.1) * 1.1, 1)
    shieldPowerUpSprite.name = 'shield'
    sprite.add(shieldPowerUpSprite)

    shieldPowerUpSprite.visible = false

    const speedPowerUpSpriteTileUrl = _buildAssetUrl('assets/speed_powerup.png')
    const speedPowerUpSpriteTile = new window.THREE.TextureLoader().load(speedPowerUpSpriteTileUrl)
    const speedPowerUpSpriteMaterial = new window.THREE.SpriteMaterial({ map: speedPowerUpSpriteTile })
    const speedPowerUpSprite = new window.THREE.Sprite(speedPowerUpSpriteMaterial)
    speedPowerUpSprite.scale.set(HitBox.width * 0.6, HitBox.height * 1.1, 1)
    speedPowerUpSprite.name = 'speed'
    sprite.add(speedPowerUpSprite)

    speedPowerUpSprite.visible = false

    // add hourglass indicator
    hourglassIndicator.actionSprite.name = `hourglass_indicator_${Avatar.playerId}`
    hourglassIndicator.actionSprite.scale.set((HitBox.width * 0.6) * 0.45, (HitBox.height * 1.1) * 0.45, 1)
    hourglassIndicator.actionSprite.position.x -= HitBox.width * 0.35
    hourglassIndicator.actionSprite.position.y += HitBox.height * 0.3
    hourglassIndicator.actionSprite.renderOrder = 1
    hourglassIndicator.actionSprite.visible = false

    sprite.add(hourglassIndicator.actionSprite)

    // "SWAPPED" indicator sprite
    const swappedIndicatorSpriteTextureUrl = _buildAssetUrl('assets/swapped_sprite.png')
    const swappedIndicatorSpriteTexture = new window.THREE.TextureLoader().load(swappedIndicatorSpriteTextureUrl)
    swappedIndicatorSpriteTexture.magFilter = window.THREE.NearestFilter
    const swappedIndicatorSpriteMaterial = new window.THREE.SpriteMaterial({ map: swappedIndicatorSpriteTexture })
    const swappedIndicatorSprite = new window.THREE.Sprite(swappedIndicatorSpriteMaterial)
    swappedIndicatorSprite.scale.set(1.5, 1.6, 1)
    swappedIndicatorSprite.name = 'swapped'

    swappedIndicatorSprite.visible = false

    sprite.add(swappedIndicatorSprite)

    return sprite
}

function _buildPowerUpEntity (components) {
    const { PowerUp, Transform, HitBox } = components

    let spriteTile
    switch (PowerUp.type) {
        case 'shield':
            spriteTile = new window.THREE.TextureLoader().load(_buildAssetUrl('assets/shield_powerup.png'))
            break
        case 'speed':
            spriteTile = new window.THREE.TextureLoader().load(_buildAssetUrl('assets/speed_powerup.png'))
            break
        default:
            throw new Error('Invalid power up type')

    }
    const spriteMaterial = new window.THREE.SpriteMaterial({ map: spriteTile })
    const sprite = new window.THREE.Sprite(spriteMaterial)
    sprite.scale.set(HitBox.width, HitBox.height, 1)

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

        this.aspectRatio = 16 / 9
        this.frustumSize = 25
        const nearest = nearestToAspectRatio(this.aspectRatio, window.innerWidth, window.innerHeight)
        const windowWidth = nearest.width
        const windowHeight = nearest.height

        const halfHeight = this.frustumSize / 2
        const halfWidth = this.frustumSize * this.aspectRatio / 2

        this.clock = new window.THREE.Clock()
        this.scene = new window.THREE.Scene()
        this.renderer = new window.THREE.WebGLRenderer({ canvas: canvas })
        this.renderer.setSize(windowWidth, windowHeight)
        this.camera = new window.THREE.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, -100, 1000)
        this.spriteMixer = SpriteMixer()

        this.camera.position.z = 100
        this.spectatorMode = false

        this.renderer.setSize(windowWidth, windowHeight)

        this.isRendering = false
        this.latestTickRendered = -1
        this.latestTickReceived = -1

        this.entityIdThreeJsIdMap = new Map()
        this.playersAvatarId = null
        this.uiElements = {
            playerUi: null,
            tieBreakerUi: null,
            intercomTextUi: null,
            stateChangeIndicatorsUi: null,
        }

        this.animatedEntities = new Map() // key: entity name, value: AnimatedComponent

        // of type window.IntercomMsg (see intercomText.js for more info)
        this.intercomMsgQueue = []
        this.beganDisplayingIntercomMsgAt = -1

        // index of sprites in the tilesheet corresponds to the sprite' id - 1 (i.e. sprite id 1 is at index 0)
        const spriteSheetUrl = _buildAssetUrl('assets/haunted_house.png')
        _loadTileSheet(this.scene, spriteSheetUrl, 64).then((spriteMaterials) => {
            this.spriteMaterials = spriteMaterials
        })

        window.addEventListener('resize', () => {
            this._resizeRenderer()
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

            if (this.spectatorMode) {
                const spectatingFrustumSize = 35
                const windowWidth = window.innerWidth
                const windowHeight = window.innerHeight
                const aspectRatio = windowWidth / windowHeight

                this.camera.left = spectatingFrustumSize * aspectRatio/-2
                this.camera.right = spectatingFrustumSize * aspectRatio/2
                this.camera.top = spectatingFrustumSize/2
                this.camera.bottom = spectatingFrustumSize/-2

                this.camera.updateProjectionMatrix()
            }

            this.latestTickRendered = this.latestTickReceived
            this.renderer.render(this.scene, this.camera)
            window.gameUiManager.update()

            const delta = this.clock.getDelta()
            this.spriteMixer.update(delta)

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
        this.clock.start()
    }

    stop () {
        this.isRendering = false
    }

    pushToIntercomMsgQueue (msg) {
        this.intercomMsgQueue.push(msg)
    }

    peekHeadOfIntercomMsgQueue () {
        if (this.intercomMsgQueue.length === 0) {
            return null
        }

        // display the message at the head of queue for specified duration
        const head = this.intercomMsgQueue[0]
        if (this.beganDisplayingIntercomMsgAt === -1) {
            this.beganDisplayingIntercomMsgAt = Date.now()
        } else if (Date.now() - this.beganDisplayingIntercomMsgAt > head.displayDurationMsg) {
            this.intercomMsgQueue.shift()
            this.beganDisplayingIntercomMsgAt = -1
        }

        return head
    }

    _addEntityToScene (entityId, entityComponents, entitiesInScene) {
        if (this.isEntityInScene(entityId)) {
            return
        }

        if (!this.spriteMaterials) {
            return
        }

        // find score board entity if it exists
        let scoreBoardEntity = null
        for (const [entityId, entityComponents] of Object.entries(entitiesInScene)) {
            if (entityComponents.KillStreakScoreBoard) {
                scoreBoardEntity = entityComponents
                break
            }
        }

        // find round timer if it exists
        let roundTimerEntity = null
        for (const [entityId, entityComponents] of Object.entries(entitiesInScene)) {
            if (entityComponents.RoundTimer) {
                roundTimerEntity = entityComponents
                break
            }
        }

        let numConnectedPlayers = 0
        for (const [entityId, entityComponents] of Object.entries(entitiesInScene)) {
            if (entityComponents.Avatar) {
                numConnectedPlayers++
            }
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
            terrain.renderOrder = -1
            this.scene.add(terrain)
            this.entityIdThreeJsIdMap.set(entityId, terrain.id)
            threeJsId = terrain.id
        } else if (entityComponents.PowerUp && entityComponents.Transform) {
            const powerUp = _buildPowerUpEntity(entityComponents)
            this.scene.add(powerUp)
            this.entityIdThreeJsIdMap.set(entityId, powerUp.id)
            threeJsId = powerUp.id
        } else if (entityComponents.Avatar && entityComponents.Transform && entityComponents.HitBox) {
            const hourglassIndicator = buildHourglassIndicator(this.spriteMixer)
            const avatar = _buildPlayerEntity(entityComponents, hourglassIndicator)
            this.scene.add(avatar)
            this.entityIdThreeJsIdMap.set(entityId, avatar.id)
            this.animatedEntities.set(hourglassIndicator.actionSprite.name, hourglassIndicator)
            threeJsId = avatar.id

            if (entityComponents.Avatar && entityComponents.Avatar.playerId === this.username) {
                this.playersAvatarId = avatar.id
                this.uiElements.playerUi = window.gameUiManager.addComponentToScene('hudOverlay', {
                    playerId: this.username,
                    gameMode: this.sessionConfig.gameMode,
                    lives: entityComponents.Avatar.stateData.lives,
                    kills: entityComponents.Avatar.stateData.kills,
                    activePowerUp: entityComponents.Avatar.stateData.activePowerUp,
                    isSpectating: this.spectatorMode,
                    killStreaks: scoreBoardEntity ? scoreBoardEntity.KillStreakScoreBoard.highestKillStreakByPlayerId : null,
                    msRemaining: roundTimerEntity ? roundTimerEntity.RoundTimer.msRemaining : null,
                    numConnectedPlayers: numConnectedPlayers,
                })

                this.uiElements.intercomTextUi = window.gameUiManager.addComponentToScene('intercomText', {
                    msgToDisplay: this.peekHeadOfIntercomMsgQueue()
                })

                this.uiElements.stateChangeIndicatorsUi = window.gameUiManager.addComponentToScene('stateChangeIndicators', {
                    isOnCoolDown: entityComponents.Avatar.stateData.stateSwitchCooldownTicks > 0,
                })

                this.pushToIntercomMsgQueue(
                  new IntercomMsg(
                    'Welcome to the game!',
                    'Use WASD to move around.',
                    3500
                  )
                )
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

        if (entityComponents.Avatar) {
            switch (entityComponents.Avatar.stateData.activePowerUp) {
                case 'shield':
                    entity.getObjectByName('shield').visible = true
                    break
                case 'speed':
                    entity.getObjectByName('speed').visible = true
                    break
                default:
                    // disable all indicators for powerups
                    const powerUpNames = ['shield', 'speed']
                    powerUpNames.forEach((powerUpName) => {
                        entity.getObjectByName(powerUpName).visible = false
                    })
                    break
            }
        }

        // show hourglass indicator if player is cooling down from RPS state switch
        if (
            entityComponents.Avatar
            && entityComponents.Avatar.playerId === this.username
            && entityComponents.Avatar.stateData.stateSwitchCooldownTicks > 0
            && this.animatedEntities.has(`hourglass_indicator_${entityComponents.Avatar.playerId}`)
            && this.animatedEntities.get(`hourglass_indicator_${entityComponents.Avatar.playerId}`).actionSprite.visible === false
        ) {
            const hourglassIndicator = this.animatedEntities.get(`hourglass_indicator_${entityComponents.Avatar.playerId}`)
            hourglassIndicator.actionSprite.visible = true
            hourglassIndicator.actions().spin.playLoop()
        }

        // hide hourglass indicator if player is not cooling down from RPS state switch
        if (
            entityComponents.Avatar
            && entityComponents.Avatar.playerId === this.username
            && entityComponents.Avatar.stateData.stateSwitchCooldownTicks === 0
            && this.animatedEntities.has(`hourglass_indicator_${entityComponents.Avatar.playerId}`)
            && this.animatedEntities.get(`hourglass_indicator_${entityComponents.Avatar.playerId}`).actionSprite.visible === true
        ) {
            const hourglassIndicator = this.animatedEntities.get(`hourglass_indicator_${entityComponents.Avatar.playerId}`)
            hourglassIndicator.actionSprite.visible = false
            hourglassIndicator.actions().spin.stop()
        }

        // show swapped indicator if player was auto swapped
        if (entityComponents.Avatar && entityComponents.Avatar.stateData.autoStateSwitched) {
            entity.getObjectByName('swapped').visible = true
        }

        // hide swapped indicator if player was not auto swapped
        if (entityComponents.Avatar && !entityComponents.Avatar.stateData.autoStateSwitched) {
            entity.getObjectByName('swapped').visible = false
        }

        if (entityComponents.Avatar
            && entityComponents.Avatar.playerId === this.username
            && entityComponents.Transform
            && this.uiElements.playerUi) {

            const vector = entity.position.clone()
            vector.project(this.camera)
            this._updateStatsForPlayer(entityComponents, entitiesInScene)

            window.gameUiManager.updateComponent(this.uiElements.intercomTextUi, {
                msgToDisplay: this.peekHeadOfIntercomMsgQueue()
            })

            window.gameUiManager.updateComponent(this.uiElements.stateChangeIndicatorsUi, {
                isOnCoolDown: entityComponents.Avatar.stateData.stateSwitchCooldownTicks > 0
            })
        }

        if (entityComponents.Avatar
          && entityComponents.Avatar.playerId === this.username
          && entityComponents.Avatar.state === 'spectating') {
            this.spectatorMode = true
        }
    }

    _updateStatsForPlayer (entityComponents, entitiesInScene) {
        let scoreBoardEntity = null
        let roundTimerEntity = null
        let numConnectedPlayers = 0
        for (const [entityId, entityComponents] of Object.entries(entitiesInScene)) {
            if (entityComponents.KillStreakScoreBoard) {
                scoreBoardEntity = entityComponents
                continue
            }

            if (entityComponents.RoundTimer) {
                roundTimerEntity = entityComponents
                continue
            }

            if (entityComponents.Avatar) {
                numConnectedPlayers++
            }
        }

        window.gameUiManager.updateComponent(this.uiElements.playerUi, {
            lives: entityComponents.Avatar.stateData.lives,
            gameMode: this.sessionConfig.gameMode,
            kills: entityComponents.Avatar.stateData.kills,
            activePowerUp: entityComponents.Avatar.stateData.activePowerUp,
            isSpectating: this.spectatorMode,
            playerInfoStyle: {
                isVisible: entityComponents.Avatar.state === 'alive'
            },
            killStreaks: scoreBoardEntity ? scoreBoardEntity.KillStreakScoreBoard.highestKillStreakByPlayerId : null,
            msRemaining: roundTimerEntity ? roundTimerEntity.RoundTimer.msRemaining : null,
            numConnectedPlayers: numConnectedPlayers
        })
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

        this.scene.remove(this.scene.getObjectById(threeJsId))
    }

    _resizeRenderer () {
        const nearest = nearestToAspectRatio(this.aspectRatio, window.innerWidth, window.innerHeight)
        const windowWidth = nearest.width
        const windowHeight = nearest.height

        const halfHeight = this.frustumSize / 2
        const halfWidth = this.frustumSize * this.aspectRatio / 2

        this.camera.left = -halfWidth
        this.camera.right = halfWidth
        this.camera.top = halfHeight
        this.camera.bottom = -halfHeight

        this.camera.updateProjectionMatrix()
        this.renderer.setSize(windowWidth, windowHeight)
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

function restartRenderer () {
    restartUI()
}

window.restartRenderer = restartRenderer
