const passport = require('passport')
const express = require('express')
const router = express.Router()

const services = require('../services/services')

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body
    if (!username || !email || !password) {
        res.status(400).send('Missing username, email or password')
        return
    }

    try {
        await services.userManager.register(username, email, password)
        res.status(201).send('User created')
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).send('User already exists')
        } else {
            res.status(500).send('Internal server error')
        }
    }
})

router.post('/login', passport.authenticate('local'), (req, res) => {
    const { username } = req.user
    console.log(`User ${username} logged in`)
    const jwtToken = services.authentication.generateToken(username)
    res.status(200).send({
        authToken: jwtToken
    })
})

module.exports = router
