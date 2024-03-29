const express = require('express')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const JwtStrategy = require("passport-jwt").Strategy
const ExtractJwt = require("passport-jwt").ExtractJwt
const path = require('path')
const { networkInterfaces } = require('os')

require('dotenv').config()

const logger = require('./server/util/logger')

const services = require('./server/services/services')
const registerRoutes = require('./server/routes/routes')
const WebSocketServer = require('./server/net/webSocketServer')
const { preComputeDistances } = require('./server/levels/level')

function init () {
    // bake level distances
    preComputeDistances()
}

try {
    init()
} catch (err) {
    logger.error('Failed to initialize server: ' + e)
}

const app = express()
const port = 8080

const wsPort = 8081

app.use(require('cors')())
app.use(require('express-session')({
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(express.json())
app.use(express.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'gameview/public')))
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => {
    done(null, user)
})

passport.deserializeUser((user, done) => {
    done(null, user)
})

passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const isValid = await services.authentication.validUserCredentials(username, password)
            if (isValid) {
                done(null, {username})
            } else {
                done(null, false)
            }
        } catch (err) {
            done(err)
        }
    }
))

const jwtOps = {}
jwtOps.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken()
jwtOps.secretOrKey = process.env.JWT_SIGNING_SECRET
jwtOps.issuer = 'rockpaperscissorsbrawl2d.com'
jwtOps.audience = 'rockpaperscissorsbrawl2d.com'
passport.use(new JwtStrategy(jwtOps,
    async (jwtPayload, done) => {
        try {
            if (jwtPayload.temp) {
                // user is anonymous
                done(null, {username: jwtPayload.username})

                return
            }

            const userExists = await services.authentication.doesUserExist(jwtPayload.username)
            if (userExists) {
                done(null, {username: jwtPayload.username})
            } else {
                done(null, false)
            }
        } catch (err) {
            done(err)
        }
    }
))

registerRoutes(app)

const wss = new WebSocketServer(wsPort, () => {
    logger.info(`WebSocket server is running on port ${wsPort}`)
}, () => {
    logger.info('WebSocket server closed')
})

function disableRateLimit () {
    wss.disableRateLimit()
}

app.listen(port, () => {
    logger.info(`On localhost: http://localhost:${port}/`)
    if (networkInterfaces()['en0']) {
        logger.info(`On LAN: http://${networkInterfaces()['en0'][1].address}:${port}/`)
    }

    wss.start()
})

module.exports = {
    server: app,
    services: services,
    disableRateLimit: disableRateLimit
}
