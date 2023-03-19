const Service = require('./service')
const { v4: uuidv4 } = require('uuid')
const Validator = require('jsonschema').Validator
const v = new Validator()

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
    }

    _validateConfig (config) {
        const schema = {
            id: '/SessionConfig',
            type: 'object',
            properties: {
                maxPlayers: {
                    type: 'integer',
                    minimum: 2,
                    maximum: 15,
                    required: true
                }
            },
        }

        return v.validate(config, schema)
    }
}

class SessionManager extends Service {
    constructor (dbPool) {
        super(dbPool)

        this.privateSessionHosts = new Map() // Map<hostId, sessionId>
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
    }

    clearSessions () {
        this.privateSessionHosts.clear()
        this.activeSessions.clear()
    }
}

module.exports = SessionManager
