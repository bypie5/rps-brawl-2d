const msgTypes = require('../../common/rps2dProtocol')
const { v } = require('../../server/schemas')

const services = require('../services/services')
const { sessionManager } = services

function onConnectToSession(ws, msg) {
    const session = sessionManager.findSessionById(msg.sessionId)
    if (!session) {
        ws.send(JSON.stringify({
            type: msgTypes.serverToClient.ERROR.type,
            message: 'Session does not exist'
        }))
        return
    }

    if (!session.isPlayerConnected(ws.id)) {
        ws.send(JSON.stringify({
            type: msgTypes.serverToClient.ERROR.type,
            message: 'You are not connected to this session'
        }))
        return
    }

    ws.send(JSON.stringify({
        type: msgTypes.serverToClient.WELCOME.type,
        id: session.id,
        host: session.host,
        isPrivate: session.isPrivate,
        config: session.config
    }))

    session.onWsConnection(ws)

    ws.on('close', () => {
        session.onWsDisconnection(ws.id)
    })
}

function handleMessage (ws, message) {
    const msg = JSON.parse(message)
    const msgType = msgTypes.clientToServer[msg.type]

    if (msgType === undefined) {
        console.log('Unknown message type: ' + msg.type)
        return
    }

    const validationResult = v.validate(msg, msgType.schema)
    if (!validationResult.valid) {
        console.log('Invalid message: ' + validationResult.errors)
        return
    }

    switch (msg.type) {
        case msgTypes.clientToServer.CONNECT_TO_SESSION.type:            
            onConnectToSession(ws, msg)
            break
        default:
            console.log('Unknown message type: ' + msg.type)
            break
    }
}

module.exports = handleMessage
