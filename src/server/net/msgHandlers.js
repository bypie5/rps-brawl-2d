const msgTypes = require('../../common/rps2dProtocol')
const { v } = require('../../server/schemas')

const services = require('../services/services')
const { sessionManager, authentication } = services

const { enqueueCommand } = require('../ecs/commands')

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

    if (session.doesPlayerHaveWsConnection(ws.id)) {
        return // already connected
    }

    ws.send(JSON.stringify({
        type: msgTypes.serverToClient.WELCOME.type,
        id: session.id,
        host: session.host,
        isPrivate: session.isPrivate,
        config: session.config,
        sessionSate: session.getSessionState()
    }))

    session.onWsConnection(ws)

    ws.on('close', () => {
        session.onWsDisconnection(ws.id)
    })
}

function disconnectFromSession (ws, msg) {
    const session = sessionManager.findSessionById(msg.sessionId)
    if (!session) {
        ws.send(JSON.stringify({
            type: msgTypes.serverToClient.ERROR.type,
            message: 'Session does not exist'
        }))
        return
    }

    if (session.isPlayerConnected(ws.id)) {
        sessionManager.disconnectPlayerFromSession(ws.id, msg.sessionId)
        ws.send(JSON.stringify({
            type: msgTypes.serverToClient.DISCONNECTED.type,
            message: 'You are not connected to this session'
        }))
    }

    ws.on('close', () => {
        // do nothing since player is not connected to session
    })
}

function onGameplayCommand(ws, msg) {
    enqueueCommand(ws, msg.payload, msg.gameplayCommandType)
}

function onUpgradeAnonymousWsConnection(ws, msg) {
    const authToken = msg.authToken
    const claims = authentication.getJwtClaims(authToken)

    const oldId = ws.id
    ws.id = claims.username
    if (oldId) {
        console.log(`Upgraded anonymous connection (id ${oldId}) for user ${claims.username}`)
    }

    ws.onIdChange(ws.id, oldId)

    ws.send(JSON.stringify({
        type: msgTypes.serverToClient.UPGRADED_WS_CONNECTION.type
    }))
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
            if (ws.id === undefined) {
                ws.send(JSON.stringify({
                    type: msgTypes.serverToClient.ERROR.type,
                    message: 'You must be logged in to connect to a session'
                }))
                return
            }

            onConnectToSession(ws, msg)
            break
        case msgTypes.clientToServer.GAMEPLAY_COMMAND.type:
            if (ws.id === undefined) {
                ws.send(JSON.stringify({
                    type: msgTypes.serverToClient.ERROR.type,
                    message: 'You must be logged in to connect to a session'
                }))
                return
            }

            onGameplayCommand(ws, msg)
            break
        case msgTypes.clientToServer.UPGRADE_ANONYMOUS_WS.type:
            onUpgradeAnonymousWsConnection(ws, msg)
            break
        case msgTypes.clientToServer.PONG.type:
            ws.lastPongSeen = Date.now()
            break
        case msgTypes.clientToServer.DISCONNECT_FROM_SESSION.type:
            disconnectFromSession(ws, msg)
            break
        default:
            console.log('Unknown message type: ' + msg.type)
            break
    }
}

module.exports = handleMessage
