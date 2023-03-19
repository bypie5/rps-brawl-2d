const Service = require('./service')
const { v4: uuidv4 } = require('uuid')

class Session {
    constructor (id, hostId, isPrivate) {
        this.id = id
        this.host = hostId
        this.isPrivate = isPrivate
    }
}

class SessionManager extends Service {
    constructor (dbPool) {
        super(dbPool)

        this.activeSessions = new Map()
    }

    createPrivateSession (hostId) {
        const id = uuidv4()
        const session = new Session(id, hostId, true)

        this.activeSessions.set(id, session)
    }
}

module.exports = SessionManager
