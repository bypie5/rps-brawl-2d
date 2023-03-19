const ws = require('ws')

const handleMessage = require('./msgHandlers')
const services = require('../services/services')
const { authentication } = services

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
        const username = claims.username

        ws.id = username
        ws.on('message', (message) => this.onMessage(ws, message))
    }

    onMessage (ws, message) {
        handleMessage(ws, message)
    }
}

module.exports = WebSocketServer
