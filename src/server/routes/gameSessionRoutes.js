const passport = require('passport')
const express = require('express')
const router = express.Router()

const services = require('../services/services')

router.post('/create-private-session', (req, res) => {
    res.status(200).send('Private session created')
})

module.exports = router
