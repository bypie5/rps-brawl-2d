const passport = require('passport')
const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')

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

/**
 * UNSAFE - REMOVE BEFORE PRODUCTION
 *
 * @api {post} /api/user/temp-credentials Request temporary credentials
 *
 * This endpoint will grant a user temporary access to the API. The user does not
 * have to be logged in to use this endpoint.
*/
router.post('/temp-credentials', (req, res) => {
    const anonUser = `anon-user-${uuidv4()}`

    const tempJwtToken = services.authentication.generateTemporaryAccessToken(anonUser)
    res.status(200).send({
        authToken: tempJwtToken,
        username: anonUser
    })
})

module.exports = router
