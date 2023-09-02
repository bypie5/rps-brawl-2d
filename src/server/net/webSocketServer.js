const ws = require('ws')
const { v4: uuidv4 } = require('uuid')

const logger = require('../util/logger')
const handleMessage = require('./msgHandlers')
const msgTypes = require('../../common/rps2dProtocol')
const services = require('../services/services')
const { authentication } = services

class WebSocketServer {
    constructor (port, onStarted, onStopped) {
        this.port = port
        this.onStarted = onStarted
        this.onStopped = onStopped

        this.server = null
        this.connections = new Map() // Map<ws.id, ws>
        this.heartbeatInterval = null
        this.intervalBetweenHeartbeats = 25000
    }

    start () {
        this.server = new ws.Server({port: this.port})
        this.server.on('connection', (ws, req) => this.onConnection(ws, req))

        this.onStarted()

        this.heartbeatInterval = setInterval(() => {
            this._wsHeartbeat()
        }, this.intervalBetweenHeartbeats)
    }

    stop () {
        this.server.close()
        this.onStopped()

        this.server = null
        clearInterval(this.heartbeatInterval)
    }

    onConnection (ws, req) {
        ws.onIdChange = this._onWsIdChanged
        ws.server = this
        if (!req.headers['authorization']) {
            logger.info('Anonymous connection opened')
            ws.id = uuidv4()
        } else {
            const authToken = req.headers['authorization'].split(' ')[1]

            let claims
            try {
                claims = authentication.getJwtClaims(authToken)
            } catch (err) {
                ws.send(JSON.stringify({
                    type: msgTypes.serverToClient.ERROR.type,
                    errorCode: 'INVALID_AUTH_TOKEN',
                    message: 'Invalid auth token'
                }))
                return
            }
            const username = claims.username

            ws.id = username
        }
        ws.on('message', (message) => this.onMessage(ws, message))
        ws.on('close', () => {
            this.connections.delete(ws.id)
        })

        this.connections.set(ws.id, ws)
    }

    onMessage (ws, message) {
        handleMessage(ws, message)
    }

    _onWsIdChanged (newId, oldId) {
        logger.info(`WebSocket id changed from ${oldId} to ${newId}`)
        const ws = this.server.connections.get(oldId)
        this.server.connections.delete(oldId)
        this.server.connections.set(newId, ws)
    }

    _wsHeartbeat () {
        this.connections.forEach((ws) => {
            if (
              ws.lastPingSent &&
              ((Date.now() - ws.lastPongSeen > this.intervalBetweenHeartbeats + 125) || !ws.lastPongSeen)
            ) {
                logger.info(`Closing connection to ${ws.id} due to heartbeat timeout`)
                ws.close()
            } else {
                ws.send(JSON.stringify({
                    type: msgTypes.serverToClient.PING.type,
                    message: 'ping'
                }))
                ws.lastPingSent = Date.now()
            }
        })
    }
}

module.exports = WebSocketServer
