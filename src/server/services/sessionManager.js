const Service = require('./service')
const { v4: uuidv4 } = require('uuid')

class Session {
    constructor (id, hostId, isPrivate) {
        this.id = id
        this.host = hostId
        this.isPrivate = isPrivate
    }
}

class UserIsAlreadyHostError extends Error {
    constructor (message) {
        super(message)
        this.name = 'UserIsAlreadyHostError'
    }
}

class SessionManager extends Service {
    constructor (dbPool) {
        super(dbPool)

        this.privateSessionHosts = new Map() // Map<hostId, sessionId>
        this.activeSessions = new Map()
    }

    createPrivateSession (hostUsername) {
        if (this.privateSessionHosts.has(hostUsername)) {
            throw new UserIsAlreadyHostError('User already has a private session')
        }

        const id = uuidv4()
        const session = new Session(id, hostUsername, true)

        this.activeSessions.set(id, session)
        this.privateSessionHosts.set(hostUsername, id)
    }

    clearSessions () {
        this.privateSessionHosts.clear()
        this.activeSessions.clear()
    }
}

module.exports = SessionManager
