const express = require('express')
const router = express.Router()

const services = require('../services/services')

router.post('/create-private-session', (req, res) => {
    const { username } = req.session.passport.user

    try {
        services.sessionManager.createPrivateSession(username)
        res.status(200).send('Private session created')
    } catch (err) {
        if (err.name === 'UserIsAlreadyHostError') {
            res.status(400).send('User already has a private session')
        } else {
            res.status(500).send('Internal server error')
        }
    }
})

module.exports = router
