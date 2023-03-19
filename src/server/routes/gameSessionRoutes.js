const express = require('express')
const router = express.Router()

const services = require('../services/services')

router.post('/create-private-session', (req, res) => {
    const { username } = req.session.passport.user

    try {
        const { config } = req.body
        if (!config) {
            res.status(400).send('Missing session config')
            return
        }

        services.sessionManager.createPrivateSession(username, config)
        res.status(200).send('Private session created')
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

module.exports = router
