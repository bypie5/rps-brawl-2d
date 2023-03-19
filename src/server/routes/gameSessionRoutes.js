const express = require('express')
const router = express.Router()

const services = require('../services/services')
const { sessionManager } = services

router.post('/create-private-session', (req, res) => {
    const { username } = req.session.passport.user

    try {
        const { config } = req.body
        if (!config) {
            res.status(400).send('Missing session config')
            return
        }

        const fname = sessionManager.createPrivateSession(username, config)
        res.status(200).send({
            friendlyName: fname
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
    console.log(`User ${username} is trying to join session ${friendlyName}`)

    if (!friendlyName) {
        res.status(400).send('Missing friendly name')
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

    res.status(200).send(JSON.stringify(session))
})

module.exports = router
