const EventEmitter = require('node:events')

const Service = require('./service')
const { v4: uuidv4 } = require('uuid')
const { v, sessionConfigSchema } = require('../schemas')
const pako = require('pako')

const msgTypes = require('../../common/rps2dProtocol')
const {
    buildPlayerEntity,
    buildBarrierEntity,
    buildTerrainEntity,
    buildSpawnPointEntity
} = require('../ecs/entities')
const {
    physics,
    rps,
    powerups,
    tieBreaker,
    spawn,
    score,
    timeLimit
} = require('../ecs/systems')
const { loadNavGrid } = require('../levels/navGrid')
const {
    mapCodeToLevelFilePath,
    levelZero,
    levelOne
} = require('../levels/level')
const { buildEntityProxy } = require('../ecs/util')

const {
    createCpuAgent,
    createNaivePursuit,
    createNaiveMatchTarget,
    createNaiveRandomBracket,
    createPathFindingPursuit,
    supportedAgents
} = require('../agents/agentFactory')

const sessionStates = {
    INITIALIZING: 'INITIALIZING',
    WAITING_FOR_PLAYERS: 'WAITING_FOR_PLAYERS',
    IN_PROGRESS: 'IN_PROGRESS',
    FINISHED: 'FINISHED'
}

const sessionEvents = {
    PLAYER_DISCONNECTED: 'PLAYER_DISCONNECTED',
    KICKED_PLAYER: 'KICKED_PLAYER',
    SESSION_TIME_LIMIT_REACHED: 'SESSION_TIME_LIMIT_REACHED',
}

class UserIsAlreadyHostError extends Error {
    constructor (message) {
        super(message)
        this.name = 'UserIsAlreadyHostError'
    }
}

class InvalidSessionConfigError extends Error {
    constructor (message) {
        super(message)
        this.name = 'InvalidSessionConfigError'
    }
}

class SessionIsFullError extends Error {
    constructor (message) {
        super(message)
        this.name = 'SessionIsFullError'
    }
}

class InvalidFriendlyNameError extends Error {
    constructor (message) {
        super(message)
        this.name = 'InvalidFriendlyNameError'
    }
}

class SessionNotFoundError extends Error {
    constructor (message) {
        super(message)
        this.name = 'SessionNotFoundError'
    }
}

class SessionNotOpenError extends Error {
    constructor (message) {
        super(message)
        this.name = 'SessionNotOpenError'
    }
}

class FailedToAddAgentError extends Error {
    constructor (message) {
        super(message)
        this.name = 'FailedToAddAgentError'
    }
}

class FailedToRemoveAgentError extends Error {
    constructor (message) {
        super(message)
        this.name = 'FailedToRemoveAgentError'
    }
}

class Session extends EventEmitter {
    constructor (id, hostId, isPrivate, config) {
        super()

        this.id = id
        this.host = hostId
        this.isPrivate = isPrivate

        const validationResult = this._validateConfig(config)
        if (!validationResult.valid) {
            throw new InvalidSessionConfigError('Invalid session config')
        }

        this.config = config

        this.currState = sessionStates.INITIALIZING
        this.connectedPlayers = new Set() // Set<username>
        this.playerEntities = new Map() // Map<username, entityId>
        this.agents = new Map() // Map<agentId, agent>
        this.map = null

        this.wsConnections = new Map() // Map<username, ws>
        this.timeLastMessageReceieved = new Map() // Map<username, time>
        this.commandQueue = [] // { ws, msg, type }
        this.applyCommandsCallback = null
        this.inactiveTimeoutMs = 1000 * 60 * 2.5 // 2.5 minutes

        this.gameContext = {
            currentTick: 0,
            deltaTime: 0,
            lastTickTime: 0,
            gridWidth: 0,
            gameMode: config.gameMode,
            entities: {}
        }

        this.gameLoopInterval = null
        this.frameRate = 1000 / 30 // 30 fps

        this.maxTicksBetweenCheckpoints = Math.floor(this.frameRate)
        this.ticksSinceLastCheckpoint = this.maxTicksBetweenCheckpoints
        this.entitiesModified = new Set()
        this.entitiesRemoved = new Set()

        // memory for systems to save data between ticks
        this.systemContexts = {
            physics: {
            },
            rps: {
            },
            powerups: {
                supportedPowerups: ['shield', 'speed'],
                powerUpDurations: {
                    shield: 33 * 8.5,
                    speed: 33 * 8.5
                },
                initialDelay: 33 * 10, // don't spawn powerups for the first 10 seconds
                timeToLivePowerupTicks: 33 * 15,
                maxTicksBetweenPowerupSpawns: 33 * 20,
                minTicksBetweenPowerupSpawns: 33 * 7.5,
                ticksBetweenPowerupSpawns: 0,
                idsOfSpawnedPowerups: new Set()
            },
            tieBreaker: {
            },
            spawn: {
            },
            score: {
            },
            timeLimit: {
                publicMatchTimeLimitMs: 60 * 15 * 1000, // 15 minutes
                matchStartedAt: 0,
                timeSinceMatchStartMs: 0,
            }
        }
    }

    playerConnected (username) {
        if (
          this.currState !== sessionStates.WAITING_FOR_PLAYERS
          && this.isPrivate
        ) {
            // prevent players from joining private sessions that are not waiting for players
            throw new SessionNotOpenError('Session is not waiting for players')
        }

        if (this.connectedPlayers.size >= this.config.maxPlayers) {
            throw new SessionIsFullError('Session is full')
        }

        this.connectedPlayers.add(username)

        if (!this.playerEntities.has(username)) {
            this._addPlayerEntityToSession(username)
        }

        console.log(`Player ${username} joined session ${this.id}`)
        this.timeLastMessageReceieved.set(username, Date.now())
    }

    playerDisconnected (username, reason, userInitiated) {
        this.connectedPlayers.delete(username)

        if (this.wsConnections.has(username)) {
            // send message to client to inform them they were disconnected
            this.wsConnections.get(username).send(JSON.stringify({
                type: msgTypes.serverToClient.DISCONNECTED.type,
                message: reason,
                wasUserInitiated: userInitiated
            }))
        }

        this.onWsDisconnection(username)
        this._removePlayerEntityFromSession(username)

        console.log(`Player ${username} left session ${this.id}`)

        this.emit(sessionEvents.PLAYER_DISCONNECTED, username, this.id)
    }

    kickPlayer (username) {
        this.timeLastMessageReceieved.delete(username)
        this.emit(sessionEvents.KICKED_PLAYER, username, this.id)
    }

    doesPlayerHaveWsConnection (username) {
        return this.wsConnections.has(username)
    }

    pushCommand (ws, msg, type, applyCommands) {
        if (!this.applyCommandsCallback) {
            this.applyCommandsCallback = applyCommands
        }

        this.commandQueue.push({ ws, msg, type })

        // log the time we last received a message from this player
        this.timeLastMessageReceieved.set(ws.id, Date.now())
    }

    addAgent (agentId, agent) {
        this.agents.set(agentId, agent)
    }

    getRandomAgentId () {
        const agentIds = Array.from(this.agents.keys())
        const randomIndex = Math.floor(Math.random() * agentIds.length)
        return agentIds[randomIndex]
    }

    removeAgent (agentId) {
        this.agents.delete(agentId)
        this.connectedPlayers.delete(agentId)
        this._removePlayerEntityFromSession(agentId)
    }

    isPlayerConnected (username) {
        return this.connectedPlayers.has(username)
    }

    getConnectedPlayers () {
        return Array.from(this.connectedPlayers)
    }

    isMatchFull () {
        return this.connectedPlayers.size >= this.config.maxPlayers
    }

    getMaxPlayers () {
        return this.config.maxPlayers
    }

    numberOfHumanPlayers () {
        let count = 0
        for (const username of this.connectedPlayers) {
            if (!this.agents.has(username)) {
                count++
            }
        }
        return count
    }

    numberOfAgents () {
        return this.agents.size
    }

    onWsConnection (ws) {
        this.wsConnections.set(ws.id, ws)
        console.log(`Player ${ws.id} WebSocket connected to session: ${this.id}`)
    }

    onWsDisconnection (id) {
        this.wsConnections.delete(id)
        console.log(`Player ${id} WebSocket disconnected from session: ${this.id}`)
    }

    broadcast (msg, fullMsg) {
        for (const ws of this.wsConnections.values()) {
            if (msg.type === msgTypes.serverToClient.GAMESTATE_UPDATE.type) {
                // compress the gamestate update
                ws.send(pako.deflate(JSON.stringify(msg)))
            } else {
                ws.send(JSON.stringify(msg))
            }
        }

        for (const agent of this.agents.values()) {
            agent.tick(fullMsg ? fullMsg : msg)
        }
    }

    openSession () {
        this.currState = sessionStates.WAITING_FOR_PLAYERS
    }

    beginGameSession () {
        this.currState = sessionStates.IN_PROGRESS

        this.generateStartingConditions()

        this.gameContext.lastTickTime = Date.now()

        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval)
        }

        this.gameLoopInterval = setInterval(() => {
            this._coreGameLoop()
        }, this.frameRate)

        this.notifyMatchStart()
    }

    notifyMatchStart () {
        this.broadcast({
            type: msgTypes.serverToClient.MATCH_STARTED.type,
            sessionState: this.currState
        })
    }

    endGameSession () {
        clearInterval(this.gameLoopInterval)
        this.gameLoopInterval = null
        this.currState = sessionStates.FINISHED
    }

    sessionTimeout () {
        this.emit(sessionEvents.SESSION_TIME_LIMIT_REACHED, this.id)
    }

    isInProgress () {
        return this.currState === sessionStates.IN_PROGRESS
    }

    getSessionState () {
        return this.currState
    }

    getSessionInfo () {
        return {
            connectedUsers: Array.from(this.connectedPlayers),
            host: this.host,
            isPrivate: this.isPrivate,
            config: this.config
        }
    }

    instantiateEntity (components) {
        const id = uuidv4()
        this.gameContext.entities[id] = new Proxy(components, buildEntityProxy(id, (id) => {
            this.entitiesModified.add(id)
        }))
        return id
    }

    removeEntity (id) {
        this.entitiesRemoved.add(id)
        delete this.gameContext.entities[id]
    }

    addAttributeToConfig (key, value) {
        const validationResult = this._validateConfig({
            ...this.config,
            [key]: value
        })

        if (!validationResult.valid) {
            throw new InvalidSessionConfigError('Invalid session config')
        }

        this.config[key] = value

        console.log(`Added attribute to session config: ${key} = ${value}`)
    }

    getEntity (id) {
        return this.gameContext.entities[id]
    }

    generateStartingConditions () {
        const mapId = this.config.map

        let map
        switch (mapId) {
            case 'map0':
                map = levelZero()
                break
            case 'map1':
                map = levelOne()
                break
            default:
                throw new Error(`Invalid map id: ${mapId}`)
        }

        this.map = map

        console.log(`Generating starting conditions for map: ${mapId}`)

        const mapGridWith = map.getGridWidth()
        map.findBarrierTiles((x, y, spriteId) => {
            const barrierEntity = buildBarrierEntity(mapGridWith, x, y, spriteId)
            this.instantiateEntity(barrierEntity)
        })

        map.findTerrainTiles((x, y, spriteId) => {
            const terrainEntity = buildTerrainEntity(mapGridWith, x, y, spriteId)
            this.instantiateEntity(terrainEntity)
        })

        const spawnPoints = map.getSpawnPoints()
        for (const spawnPoint of spawnPoints) {
            const { x, y } = spawnPoint
            const spawnPointEntity = buildSpawnPointEntity(x, y)
            this.instantiateEntity(spawnPointEntity)
        }

        for (const username of this.connectedPlayers) {
            if (this.playerEntities.has(username)) {
                // player already has an entity
                continue
            }

            this._addPlayerEntityToSession(username)
        }

        this.gameContext.gridWidth = map.getGridWidth()
    }

    _addPlayerEntityToSession (username) {
        const playerEntity = buildPlayerEntity(username, 0, 0)
        const entityId = this.instantiateEntity(playerEntity)
        this.playerEntities.set(username, entityId)
    }

    _removePlayerEntityFromSession (username) {
        const entityId = this.playerEntities.get(username)
        this.removeEntity(entityId)
        this.playerEntities.delete(username)
        this.timeLastMessageReceieved.delete(username)
    }

    _coreGameLoop () {
        let tickRenderStart = Date.now()
        this.gameContext.deltaTime = Date.now() - this.gameContext.lastTickTime
        // apply commands
        if (this.applyCommandsCallback) {
            this.applyCommandsCallback(this.commandQueue)

            this.commandQueue = []
        }

        // invoke systems ( in order of dependency )
        physics(this.gameContext, this, this.systemContexts.physics)
        powerups(this.gameContext, this, this.systemContexts.powerups)
        rps(this.gameContext, this, this.systemContexts.rps)
        tieBreaker(this.gameContext, this, this.systemContexts.tieBreaker)
        spawn(this.gameContext, this, this.systemContexts.spawn)
        score(this.gameContext, this, this.systemContexts.spawn)
        timeLimit(this.gameContext, this, this.systemContexts.timeLimit)

        // increment tick
        this.gameContext.currentTick += 1
        this.gameContext.lastTickTime = Date.now()

        // broadcast game state
        this.broadcast(this._buildMsgToBroadcast(), this._buildFullMsg())

        this._findInactivePlayers()

        let deltaTime = Date.now() - tickRenderStart
        if (deltaTime > this.frameRate) {
            console.warn(`Game loop took ${deltaTime}ms to execute in session: ${this.id}`)
        }
    }

    _buildFullMsg () {
        return {
            type: msgTypes.serverToClient.GAMESTATE_UPDATE.type,
            gameContext: this.gameContext,
            isCheckpoint: true,
            removedEntities: []
        }
    }

    _buildMsgToBroadcast () {
        if (this.ticksSinceLastCheckpoint >= this.maxTicksBetweenCheckpoints) {
            this.entitiesModified = new Set()
            this.entitiesRemoved = new Set()
            this.ticksSinceLastCheckpoint = 0
            return {
                type: msgTypes.serverToClient.GAMESTATE_UPDATE.type,
                gameContext: this.gameContext,
                isCheckpoint: true,
                removedEntities: []
            }
        } else {
            this.ticksSinceLastCheckpoint++
            return this._buildAbridgedMsg()
        }
    }

    _buildAbridgedMsg () {
        const abridgedGameContext = {
            entities: {}
        }
        for (const [id, entity] of Object.entries(this.gameContext.entities)) {
            if (this.entitiesModified.has(id)) {
                abridgedGameContext.entities[id] = entity
            }
        }

        return {
            type: msgTypes.serverToClient.GAMESTATE_UPDATE.type,
            gameContext: {
                entities: abridgedGameContext.entities,
                currentTick: this.gameContext.currentTick,
                gridWidth: this.gameContext.gridWidth,
                deltaTime: this.gameContext.deltaTime,
                gameMode: this.gameContext.gameMode,
                lastTickTime: this.gameContext.lastTickTime
            },
            isCheckpoint: false,
            removedEntities: Array.from(this.entitiesRemoved)
        }
    }

    _validateConfig (config) {
        return v.validate(config, sessionConfigSchema)
    }

    _findInactivePlayers () {
        this.timeLastMessageReceieved.forEach((time, username) => {
            // kick human player if they have been inactive for too long
            if (Date.now() - time > this.inactiveTimeoutMs && !this.agents.has(username)) {
                this.kickPlayer(username)
            }
        })
    }
}

class SessionManager extends Service {
    constructor (dbPool, autoCreateFirstPublicSession = false) {
        super(dbPool)

        this.privateSessionHosts = new Map() // Map<hostId, sessionId>
        this.sessionIdToFriendlyName = new Map() // Map<sessionId, friendlyName>
        this.publicSessionIds = new Set()
        this.activeSessions = new Map()
        this.playerToSession = new Map() // Map<username, sessionId>
        this.agents = new Map() // Map<agentId, agent>
        this.agentsToSession = new Map() // Map<agentId, sessionId>

        this.messageHandlers = null

        this.maxNumberOfPublicSessions = 10
        this.maxPlayersPerPublicSession = 10
        this.maxNumberOfBotsPerSession = 7

        // initialize first public session
        if (!autoCreateFirstPublicSession) {
            setTimeout(() => {
                this.createPublicSession()
            }, 1000)
        }
    }

    registerMessageHandlers(messageHandlers) {
        this.messageHandlers = messageHandlers
    }

    createPublicSession () {
        const config = {
            maxPlayers: this.maxPlayersPerPublicSession,
            map: "map1",
            agentType: supportedAgents.pathFindingPursuit,
            gameMode: 'endless',
            isPublic: true
        }
        const id = uuidv4()
        const session = new Session(id, null, false, config)

        this._registerSessionEventHandlers(session)

        this.activeSessions.set(id, session)
        this.publicSessionIds.add(id)

        session.beginGameSession()

        this._managePublicBotToHumanRatioForSession(id)

        // agents have just been added. notify them the match has started
        session.notifyMatchStart()

        return id
    }

    createPrivateSession (hostUsername, config) {
        if (this.privateSessionHosts.has(hostUsername)) {
            const sessionId = this.privateSessionHosts.get(hostUsername)
            this.stopPrivateSession(sessionId)
        }

        const id = uuidv4()
        const session = new Session(id, hostUsername, true, config)

        this._registerSessionEventHandlers(session)

        this.activeSessions.set(id, session)
        this.privateSessionHosts.set(hostUsername, id)
        const friendlyName = this._generateFriendlyName()
        this.sessionIdToFriendlyName.set(friendlyName, id)

        session.openSession()

        return { friendlyName, id }
    }

    joinPrivateSession (username, friendlyName) {
        const sessionId = this.sessionIdToFriendlyName.get(friendlyName)
        if (!sessionId) {
            throw new InvalidFriendlyNameError('Invalid friendly name')
        }

        const session = this.activeSessions.get(sessionId)
        if (!session) {
            throw new SessionNotFoundError('Session does not exist')
        }

        this._connectPlayerToSession(username, sessionId)

        return sessionId
    }

    joinPublicSession (username) {
        const sessionId = this._getRandomJoinablePublicSessionId()
        const session = this.activeSessions.get(sessionId)
        if (!session) {
            throw new SessionNotFoundError('Session does not exist')
        }

        this._managePublicBotToHumanRatioForSession(sessionId, 1)

        this._connectPlayerToSession(username, sessionId)

        this._manageNumberOfPublicSessions()

        return sessionId
    }

    disconnectPlayerFromSession (username, sessionId, reason = 'You have been disconnected', userInitiated = true) {
        const session = this.activeSessions.get(sessionId)
        if (!session) {
            throw new SessionNotFoundError('Session does not exist')
        }

        session.playerDisconnected(username, reason, userInitiated)
        this.playerToSession.delete(username)

        this._manageNumberOfPublicSessions()
    }

    inviteAgentToSession (sessionId) {
        const session = this.activeSessions.get(sessionId)
        if (!session) {
            throw new SessionNotFoundError('Session does not exist')
        }

        let agent
        try {
            agent = this._agentFactory(sessionId, this.messageHandlers, session.getSessionInfo().config)
        } catch (err) {
            throw new FailedToAddAgentError('Failed to create agent: ' + err.message)
        }
        this.agents.set(agent.getBotId(), agent)
        this.agentsToSession.set(agent.getBotId(), sessionId)

        this._connectPlayerToSession(agent.getBotId(), sessionId)

        session.addAgent(agent.getBotId(), agent)

        if (session.isInProgress()) {
            agent.setMatchStarted(true)
        }

        return agent.getBotId()
    }

    removeAgentFromSession (agentId) {
        const sessionId = this.agentsToSession.get(agentId)
        if (!sessionId) {
            throw new SessionNotFoundError('Session does not exist')
        }

        const session = this.activeSessions.get(sessionId)
        if (!session) {
            throw new SessionNotFoundError('Session does not exist')
        }

        session.removeAgent(agentId)
        this.agents.delete(agentId)
        this.agentsToSession.delete(agentId)
        this.playerToSession.delete(agentId)
    }

    removeRandomAgentFromSession (sessionId) {
        const session = this.activeSessions.get(sessionId)
        if (!session) {
            throw new SessionNotFoundError('Session does not exist')
        }

        const agentId = session.getRandomAgentId()
        if (!agentId) {
            throw new FailedToRemoveAgentError('No agents in session')
        }

        this.removeAgentFromSession(agentId)
    }

    findSessionById (sessionId) {
        return this.activeSessions.get(sessionId)
    }

    findSessionByUser (username) {
        const sessionId = this.playerToSession.get(username) || this.agentsToSession.get(username)
        if (!sessionId) {
            return null
        }

        return this.activeSessions.get(sessionId)
    }

    stopPrivateSession (id) {
        const session = this.activeSessions.get(id)
        if (!session) {
            throw new SessionNotFoundError('Session does not exist')
        }

        this.stopSession(id)

        if (session.isPrivate) {
            this.privateSessionHosts.delete(session.host)
            this.sessionIdToFriendlyName.delete(session.id)
        }

        console.log(`Session ${id} ended`)
    }

    stopPublicSession (id) {
        const session = this.activeSessions.get(id)
        if (!session) {
            throw new SessionNotFoundError('Session does not exist')
        }

        this.stopSession(id)

        this.publicSessionIds.delete(id)
        console.log(`Session ${id} ended`)

        this._manageNumberOfPublicSessions((id) => {
            this._managePublicBotToHumanRatioForSession(id)
        })
    }

    stopSession (id) {
        const session = this.activeSessions.get(id)
        if (!session) {
            throw new SessionNotFoundError('Session does not exist')
        }

        session.endGameSession()
        this._removeAllAgentsAndPlayersFromSession(id, 'Game is over!')
        this.activeSessions.delete(id)
    }

    getNumberOfPublicSessions () {
        return this.publicSessionIds.size
    }

    clearSessions () {
        for (const session of this.activeSessions.values()) {
            session.endGameSession()
        }

        this.privateSessionHosts.clear()
        this.activeSessions.clear()
        this.sessionIdToFriendlyName.clear()
    }

    _connectPlayerToSession (username, sessionId) {
        const session = this.activeSessions.get(sessionId)
        if (!session) {
            throw new SessionNotFoundError('Session does not exist')
        }

        session.playerConnected(username)
        this.playerToSession.set(username, sessionId)
    }

    _generateFriendlyName () {
        // format CCCAAA where A is a random uppercase letter and C is a constant.
        // C is used to make the friendly name more readable and to prevent swears from being generated
        // friendly names need to be unique
        const randomConsonant = () => {
            const consonants = 'BCDFGHJKLMNPQRSTVWXYZ'
            return consonants[Math.floor(Math.random() * consonants.length)]
        }
        const randomLetter = () => String.fromCharCode(Math.floor(Math.random() * 26) + 65)
        let friendlyName = ''
        for (let i = 0; i < 3; i++) {
            friendlyName += randomConsonant()
        }
        for (let i = 3; i < 6; i++) {
            friendlyName += randomLetter()
        }

        if (this.sessionIdToFriendlyName.has(friendlyName)) {
            return this._generateFriendlyName()
        } else {
            return friendlyName
        }
    }

    _agentFactory (sessionId, messageHandlers, sessionConfig) {
        const agentId = `${uuidv4()}-rps-brawl-agent`
        switch (sessionConfig.agentType) {
            case supportedAgents.naivePursuit:
                return createNaivePursuit(agentId, sessionId, messageHandlers)
            case supportedAgents.cpuAgent:
                return createCpuAgent(agentId, sessionId, messageHandlers)
            case supportedAgents.naiveMatchTarget:
                return createNaiveMatchTarget(agentId, sessionId, messageHandlers)
            case supportedAgents.naiveRandomBracket:
                return createNaiveRandomBracket(agentId, sessionId, messageHandlers)
            case supportedAgents.pathFindingPursuit:
                const levelFilePath = mapCodeToLevelFilePath(sessionConfig.map)
                const navGrid = loadNavGrid(levelFilePath)
                return createPathFindingPursuit(agentId, sessionId, messageHandlers, navGrid)
            default:
                throw new Error(`Unsupported agent type ${sessionConfig.agentType}`)
        }
    }

    _managePublicBotToHumanRatioForSession (sessionId, expectedHumanPlayersAdded = 0) {
        const session = this.activeSessions.get(sessionId)
        if (!session) {
            throw new SessionNotFoundError('Session does not exist')
        }

        const botsNeeded = (() => {
            const humanPlayers = session.numberOfHumanPlayers() + expectedHumanPlayersAdded
            if (
              humanPlayers + session.numberOfAgents()
              > session.getMaxPlayers()
            ) {
                // we will have too many players in this session
                // remove some bots
                return session.numberOfAgents() - expectedHumanPlayersAdded
            } else {
                return Math.min(
                    session.getMaxPlayers() - humanPlayers,
                    this.maxNumberOfBotsPerSession
                )
            }
        })()
        if (botsNeeded > session.numberOfAgents()) {
            // we need to add more bots to this session
            this._fillSessionWithBots(sessionId, botsNeeded - session.numberOfAgents())
        } else if (botsNeeded < session.numberOfAgents()) {
            const botsToRemove = session.numberOfAgents() - botsNeeded
            this._removeBotFromSession(sessionId, botsToRemove)
        }
    }

    _manageNumberOfPublicSessions (onSessionCreated) {
        let allSessionAreFull = true
        for (const sessionId of this.publicSessionIds) {
            if (!this._isSessionFullOfHumans(sessionId)) {
                allSessionAreFull = false
            } else {
                console.log(`Session ${sessionId} is full`)
            }

            if (
              this._isSessionEmptyOfHumans(sessionId)
              && this.publicSessionIds.size !== 1
            ) {
                this.stopPublicSession(sessionId)
            }
        }

        if (
          (allSessionAreFull && this.publicSessionIds.size < this.maxNumberOfPublicSessions) // if all sessions are full, create a new one
          || this.publicSessionIds.size === 0 // if there are no public sessions, create one
        ) {
            const id = this.createPublicSession()
            if (onSessionCreated) {
                onSessionCreated(id)
            }
        } else if (this.publicSessionIds.size === this.maxNumberOfPublicSessions) {
            console.log('Max number of public sessions reached!')
            throw new Error('Max number of public sessions reached')
        }
    }

    _fillSessionWithBots (sessionId, botsNeeded) {
        try {
            for (let i = 0; i < botsNeeded; i++) {
                this.inviteAgentToSession(sessionId)
            }
        } catch (e) {
            if (e instanceof FailedToAddAgentError) {
                // we failed to invite an agent to the session. This is fine, we will try again later
                console.log('Failed to invite agent to session')
            } else if (e instanceof SessionNotFoundError) {
                // the session we were trying to add an agent to no longer exists. This is fine, we will try again later
                console.log('Session no longer exists')
            } else {
                throw e
            }
        }
    }

    _removeBotFromSession (sessionId, botsToRemove) {
        try {
            for (let i = 0; i < botsToRemove; i++) {
                this.removeRandomAgentFromSession(sessionId)
            }
        } catch (e) {
            if (e instanceof FailedToRemoveAgentError) {
                // we failed to remove an agent from the session. This is fine, we will try again later
                console.log('Failed to remove agent from session')
            } else if (e instanceof SessionNotFoundError) {
                // the session we were trying to remove an agent from no longer exists. This is fine, we will try again later
                console.log('Session no longer exists')
            } else {
                throw e
            }
        }
    }

    /**
     * Gets a public session id that has space for at least one more human player
     *
     * @returns {string} a random public session id
     * @private
     */
    _getRandomJoinablePublicSessionId () {
        const joinablePublicSessionIds = Array.from(this.publicSessionIds).filter(sessionId => {
            // has space for at least one more human player
            return !this._isSessionFullOfHumans(sessionId)
        })

        if (joinablePublicSessionIds.length === 0) {
            throw new Error('No joinable public sessions')
        }

        return joinablePublicSessionIds[Math.floor(Math.random() * joinablePublicSessionIds.length)]
    }

    _registerSessionEventHandlers (session) {
        session.on(sessionEvents.PLAYER_DISCONNECTED, (username, sessionId) => {
            if (this.publicSessionIds.has(sessionId)) {
                this._managePublicBotToHumanRatioForSession(sessionId, 0)
            }
        })

        session.on(sessionEvents.KICKED_PLAYER, (username, sessionId) => {
            this.disconnectPlayerFromSession(username, sessionId, 'Kicked for inactivity', false)
            console.log(`Kicked player ${username} from session ${sessionId}`)
        })

        session.on(sessionEvents.SESSION_TIME_LIMIT_REACHED, (sessionId) => {
            console.log(`Session ${sessionId} time limit reached`)
            if (this.publicSessionIds.has(sessionId)) {
                this.stopPublicSession(sessionId)
            } else {
                this.stopSession(sessionId)
            }
        })
    }

    _isSessionFullOfHumans (sessionId) {
        const session = this.activeSessions.get(sessionId)
        return session.numberOfHumanPlayers() === this.maxPlayersPerPublicSession
    }

    _isSessionEmptyOfHumans (sessionId) {
        const session = this.activeSessions.get(sessionId)
        return session.numberOfHumanPlayers() === 0
    }

    _removeAllAgentsAndPlayersFromSession (sessionId, reason) {
        const session = this.activeSessions.get(sessionId)
        if (!session) {
            throw new SessionNotFoundError('Session does not exist')
        }

        const allPlayerUsernames = session.connectedPlayers
        for (const username of allPlayerUsernames) {
            if (this.agentsToSession.has(username)) {
                // this player is an agent
                this.removeAgentFromSession(username, sessionId)
            } else {
                // this player is a human
                this.disconnectPlayerFromSession(username, sessionId, reason, false)
            }
        }
    }
}

module.exports = SessionManager
