const Service = require('./service')
const { v4: uuidv4 } = require('uuid')
const { v, sessionConfigSchema } = require('../schemas')

const msgTypes = require('../../common/rps2dProtocol')

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

        this.wsConnections = new Map() // Map<username, ws>

        this.gameContext = {
            currentTick: 0,
            entities: {}
        }
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

    isPlayerConnected (username) {
        return this.connectedPlayers.has(username)
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
    }

    openSession () {
        this.currState = sessionStates.WAITING_FOR_PLAYERS
    }

    beginGameSession () {
        this.currState = sessionStates.IN_PROGRESS

        this.broadcast({
            type: msgTypes.serverToClient.MATCH_STARTED.type,
            sessionState: this.currState
        })
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
    }

    createPrivateSession (hostUsername, config) {
        if (this.privateSessionHosts.has(hostUsername)) {
            throw new UserIsAlreadyHostError('User already has a private session')
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

        session.playerConnected(username)
        return sessionId
    }

    findSessionById (sessionId) {
        return this.activeSessions.get(sessionId)
    }

    clearSessions () {
        this.privateSessionHosts.clear()
        this.activeSessions.clear()
        this.sessionIdToFriendlyName.clear()
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
}

module.exports = SessionManager
