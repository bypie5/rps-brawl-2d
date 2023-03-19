const ws = require('ws')

const services = require('../services/services')
const { authentication } = services.authentication

class WebSocketServer {
    constructor (port, onStarted, onStopped) {
        this.port = port
        this.onStarted = onStarted
        this.onStopped = onStopped

        this.server = null
    }

    start () {
        this.server = new ws.Server({port: this.port})
        this.server.on('connection', (ws, req) => this.onConnection(ws, req))
        this.server.on('message', (ws, message) => this.onMessage(ws, message))

        this.onStarted()
    }

    stop () {
        this.server.close()
        this.onStopped()

        this.server = null
    }

    onConnection (ws, req) {
        const authToken = req.headers['authorization'].split(' ')[1]
        const claims = authentication.getJwtClaims(authToken)    
    }

    onMessage (ws, message) {
    }
}

module.exports = WebSocketServer
