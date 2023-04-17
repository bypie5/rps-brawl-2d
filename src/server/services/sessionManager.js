const Service = require('./service')
const { v4: uuidv4 } = require('uuid')
const { v, sessionConfigSchema } = require('../schemas')

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
    tieBreaker,
    spawn
} = require('../ecs/systems')
const { levelZero } = require('../levels/level')

const { createCpuAgent } = require('../agents/agentFactory')

const sessionStates = {
    INITIALIZING: 'INITIALIZING',
    WAITING_FOR_PLAYERS: 'WAITING_FOR_PLAYERS',
    IN_PROGRESS: 'IN_PROGRESS',
    FINISHED: 'FINISHED'
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

class Session {
    constructor (id, hostId, isPrivate, config) {
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
        this.agents = new Map() // Map<agentId, agent>

        this.wsConnections = new Map() // Map<username, ws>

        this.gameContext = {
            currentTick: 0,
            deltaTime: 0,
            lastTickTime: 0,
            gridWidth: 0,
            entities: {}
        }

        this.gameLoopInterval = null
    }

    playerConnected (username) {
        if (this.currState !== sessionStates.WAITING_FOR_PLAYERS) {
            throw new SessionNotOpenError('Session is not waiting for players')
        }

        if (this.connectedPlayers.size >= this.config.maxPlayers) {
            throw new SessionIsFullError('Session is full')
        }

        this.connectedPlayers.add(username)
    }

    addAgent (agentId, agent) {
        this.agents.set(agentId, agent)
    }

    isPlayerConnected (username) {
        return this.connectedPlayers.has(username)
    }

    getConnectedPlayers () {
        return Array.from(this.connectedPlayers)
    }

    onWsConnection (ws) {
        this.wsConnections.set(ws.id, ws)
        console.log(`Player ${ws.id} connected to session: ${this.id}`)
    }

    onWsDisconnection (id) {
        this.wsConnections.delete(id)
        console.log(`Player ${id} disconnected from session: ${this.id}`)
    }

    broadcast (msg) {
        for (const ws of this.wsConnections.values()) {
            ws.send(JSON.stringify(msg))
        }

        for (const agent of this.agents.values()) {
            agent.tick(msg)
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
        }, 1000 / 30)

        this.broadcast({
            type: msgTypes.serverToClient.MATCH_STARTED.type,
            sessionState: this.currState
        })
    }

    endGameSession () {
        clearInterval(this.gameLoopInterval)
        this.gameLoopInterval = null
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
        this.gameContext.entities[id] = components
        return id
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
            default:
                throw new Error(`Invalid map id: ${mapId}`)
        }

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

        const playerEntities = []

        for (const username of this.connectedPlayers) {
            const playerEntity = buildPlayerEntity(username, 0, 0)
            playerEntities.push(playerEntity)

            this.instantiateEntity(playerEntity)
        }

        this.gameContext.gridWidth = map.getGridWidth()
    }

    _coreGameLoop () {
        let tickRenderStart = Date.now()
        this.gameContext.deltaTime = Date.now() - this.gameContext.lastTickTime
        // invoke systems ( in order of dependency )
        physics(this.gameContext, this)
        rps(this.gameContext, this)
        tieBreaker(this.gameContext, this)
        spawn(this.gameContext, this)

        // increment tick
        this.gameContext.currentTick += 1
        this.gameContext.lastTickTime = Date.now()

        // broadcast game state
        this.broadcast({
            type: msgTypes.serverToClient.GAMESTATE_UPDATE.type,
            gameContext: this.gameContext
        })

        let deltaTime = Date.now() - tickRenderStart
        if (deltaTime > 34) {
            console.warn(`Game loop took ${deltaTime}ms to execute in session: ${this.id}`)
        }
    }

    _validateConfig (config) {
        return v.validate(config, sessionConfigSchema)
    }
}

class SessionManager extends Service {
    constructor (dbPool) {
        super(dbPool)

        this.privateSessionHosts = new Map() // Map<hostId, sessionId>
        this.sessionIdToFriendlyName = new Map() // Map<sessionId, friendlyName>
        this.activeSessions = new Map()
        this.playerToSession = new Map() // Map<username, sessionId>
        this.agents = new Map() // Map<agentId, agent>
        this.agentsToSession = new Map() // Map<agentId, sessionId>

        this.messageHandlers = null
    }

    registerMessageHandlers(messageHandlers) {
        this.messageHandlers = messageHandlers
    }

    createPrivateSession (hostUsername, config) {
        if (this.privateSessionHosts.has(hostUsername)) {
            const sessionId = this.privateSessionHosts.get(hostUsername)
            this.stopPrivateSession(sessionId)
        }

        const id = uuidv4()
        const session = new Session(id, hostUsername, true, config)

        this.activeSessions.set(id, session)
        this.privateSessionHosts.set(hostUsername, id)
        const friendlyName = this._generateFriendlyName()
        this.sessionIdToFriendlyName.set(friendlyName, id)

        session.openSession()

        return friendlyName
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

    inviteAgentToSession (sessionId) {
        const session = this.activeSessions.get(sessionId)
        if (!session) {
            throw new SessionNotFoundError('Session does not exist')
        }

        const agent = this._agentFactory(sessionId, this.messageHandlers)
        this.agents.set(agent.getBotId(), agent)
        this.agentsToSession.set(agent.getBotId(), sessionId)

        this._connectPlayerToSession(agent.getBotId(), sessionId)

        session.addAgent(agent.getBotId(), agent)

        return agent.getBotId()
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

        session.endGameSession()
        this.activeSessions.delete(id)

        if (session.isPrivate) {
            this.privateSessionHosts.delete(session.host)
            this.sessionIdToFriendlyName.delete(session.id)
        }

        console.log(`Session ${id} ended`)
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

    _agentFactory (sessionId, messageHandlers) {
        const agentId = `${uuidv4()}-rps-brawl-agent`
        return createCpuAgent(agentId, sessionId, messageHandlers)
    }
}

module.exports = SessionManager
