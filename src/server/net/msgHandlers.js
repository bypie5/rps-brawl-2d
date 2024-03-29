const validator = require('validator')

const msgTypes = require('../../common/rps2dProtocol')
const { v } = require('../../server/schemas')

const services = require('../services/services')
const { sessionManager, authentication } = services

const { enqueueCommand } = require('../ecs/commands')

const logger = require('../util/logger')

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
    }

    // remove the close listener, so we take no action when the ws closes
    // since disconnectPlayerFromSession already takes care of that
    ws.removeEventListener('close', () => {
        session.onWsDisconnection(ws.id)
    }, false)
}

function onGameplayCommand(ws, msg) {
    enqueueCommand(ws, msg.payload, msg.gameplayCommandType)
}

function onUpgradeAnonymousWsConnection(ws, msg) {
    const authToken = msg.authToken

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

    const oldId = ws.id
    ws.id = claims.username
    if (oldId) {
        logger.info(`Upgraded anonymous connection (id ${oldId}) for user ${claims.username}`)
    }

    ws.onIdChange(ws.id, oldId)

    ws.send(JSON.stringify({
        type: msgTypes.serverToClient.UPGRADED_WS_CONNECTION.type
    }))
}

function sanitizeMessage(message, messageType) {
    const sanitizedMessage = JSON.parse(JSON.stringify(message))
    for (const property in messageType.schema.properties) {
        if (messageType.schema.properties[property].type === 'string' && sanitizedMessage[property]) {
            sanitizedMessage[property] = validator.escape(sanitizedMessage[property])
        }
    }

    return sanitizedMessage
}

function handleMessage (ws, message) {
    let msg
    try {
      msg = JSON.parse(message)
    } catch (err) {
      logger.warn(`Failed to parse message: ${message} - ${err}`)
      return
    }

    const msgType = msgTypes.clientToServer[msg.type]
    if (msgType === undefined) {
        logger.warn(`Unknown message type: ${msg.type}`)
        return
    }

    const validationResult = v.validate(msg, msgType.schema)
    if (!validationResult.valid) {
        logger.warn(`Invalid message (type: ${msg.type}): ${validationResult.errors}`)
        return
    }

    try {
        msg = sanitizeMessage(msg, msgType)
    } catch (err) {
        logger.warn(`Failed to sanitize message: ${message} - ${err}`)
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
            logger.warn(`Unknown message type: ${msg.type}`)
            break
    }
}

module.exports = handleMessage
