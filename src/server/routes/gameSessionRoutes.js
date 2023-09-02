const express = require('express')
const router = express.Router()

const logger = require('../util/logger')
const services = require('../services/services')
const { sessionManager } = services

const { supportedAgents } = require('../agents/agentFactory')

router.post('/create-private-session', (req, res) => {
    const { username } = req.session.passport.user

    try {
        const { config } = req.body
        if (!config) {
            res.status(400).send('Missing session config')
            return
        }

        if (!config.agentType) {
            // set default agent type
            config.agentType = supportedAgents.naivePursuit
        }

        const { friendlyName, id } = sessionManager.createPrivateSession(username, config)
        res.status(200).send({
            friendlyName: friendlyName,
            sessionId: id
        })
    } catch (err) {
        if (err.name === 'UserIsAlreadyHostError') {
            res.status(400).send('User already has a private session')
        } else if (err.name === 'InvalidSessionConfigError') {
            res.status(400).send('Invalid session config')
        } else {
            res.status(500).send('Internal server error')
        }
    }
})

router.post('/join-private-session', (req, res) => {
    const { username } = req.session.passport.user

    const { friendlyName } = req.body
    logger.info(`User ${username} is trying to join session ${friendlyName}`)

    if (!friendlyName) {
        res.status(400).send('Missing friendly name')
        return
    }

    try {
        const id = sessionManager.joinPrivateSession(username, friendlyName)
        res.status(200).send({
            sessionId: id
        })
    } catch (err) {
        if (err.name === 'SessionNotFoundError') {
            res.status(404).send('Session does not exist')
        } else if (err.name === 'SessionIsFullError') {
            res.status(400).send('Session is full')
        } else if (err.name === 'InvalidFriendlyNameError') {
            res.status(400).send('Invalid friendly name')
        } else if (err.name === 'SessionNotOpenError') {
            res.status(400).send('Session is not open')
        } else {
            res.status(500).send('Internal server error')
        }
    }
})

router.post('/join-public-session', (req, res) => {
    const { username } = req.session.passport.user

    try {
        const sessionId = sessionManager.joinPublicSession(username)
        res.status(200).send({
            sessionId: sessionId
        })
    } catch (err) {
        if (err.name === 'SessionNotFoundError') {
            res.status(404).send('Session does not exist')
        } else if (err.name === 'SessionIsFullError') {
            res.status(400).send('Session is full')
        } else if (err.name === 'SessionNotOpenError') {
            res.status(400).send('Session is not open')
        } else {
            res.status(500).send('Internal server error')
        }
    }
})

router.post('/modify-session-config', (req, res) => {
    const { username } = req.session.passport.user

    const { sessionId, attributeKey, attributeValue } = req.body
    logger.info(`User ${username} is trying to modify session ${sessionId} config`)
    if (!sessionId) {
        res.status(400).send('Missing session id')
        return
    }

    const session = sessionManager.findSessionById(sessionId)
    if (!session) {
        res.status(404).send('Session does not exist')
        return
    }

    if (session.host !== username) {
        res.status(403).send('User is not the host')
        return
    }

    try {
        session.addAttributeToConfig(attributeKey, attributeValue)
    } catch (err) {
        if (err.name === 'InvalidSessionConfigError') {
            res.status(400).send('Invalid session config')
        } else {
            res.status(500).send('Internal server error')
        }

        logger.error(err)
        return
    }

    res.status(200).send()
})

router.get('/supported-agents', (req, res) => {
    res.status(200).send({
        supportedAgentTypes: [
            supportedAgents.naivePursuit,
            supportedAgents.naiveMatchTarget,
            supportedAgents.naiveRandomBracket,
            supportedAgents.pathFindingPursuit
        ]
    })
})

router.post('/invite-agent-to-session', (req, res) => {
    const { username } = req.session.passport.user

    const { sessionId } = req.body
    logger.info(`User ${username} is trying to invite an agent to session ${sessionId}`)
    if (!sessionId) {
        res.status(400).send('Missing session id')
        return
    }

    const session = sessionManager.findSessionById(sessionId)
    if (!session) {
        res.status(404).send('Session does not exist')
        return
    }

    if (session.host !== username) {
        res.status(403).send('User is not the host')
        return
    }

    let botId = null
    try {
        botId = sessionManager.inviteAgentToSession(sessionId)
    } catch (err) {
        if (err.name === 'SessionIsFullError') {
            res.status(400).send('Session is full')
        } else if (err.name === 'FailedToAddAgentError') {
            res.status(500).send('Failed to add agent: ' + err.message)
        } else {
            res.status(500).send('Internal server error')
        }

        logger.error(err)
        return
    }

    res.status(200).send({
        botId: botId,
        sessionId: sessionId
    })
})

router.post('/start-session', (req, res) => {
    const { username } = req.session.passport.user
    const { sessionId } = req.query

    if (!sessionId) {
        res.status(400).send('Missing session id')
        return
    }

    const session = sessionManager.findSessionById(sessionId)
    if (!session) {
        res.status(404).send('Session does not exist')
        return
    }

    if (session.host !== username) {
        res.status(403).send('User is not the host')
        return
    }

    if (session.isInProgress()) {
        res.status(400).send('Session has already started')
        return
    }

    session.beginGameSession()

    res.status(200).send()
})

router.get('/session-info', (req, res) => {
    const { sessionId } = req.query
    if (!sessionId) {
        res.status(400).send('Missing session id')
        return
    }

    const session = sessionManager.findSessionById(sessionId)
    if (!session) {
        res.status(404).send('Session does not exist')
        return
    }

    res.status(200).send({
        id: session.id,
        host: session.host,
        friendlyName: session.friendlyName,
        config: session.config,
        connectedPlayers: session.getConnectedPlayers(),
        state: session.getSessionState()
    })
})

module.exports = router
