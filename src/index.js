const express = require('express')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const JwtStrategy = require("passport-jwt").Strategy
const ExtractJwt = require("passport-jwt").ExtractJwt
const path = require('path')

require('dotenv').config()

const services = require('./server/services/services')
const registerRoutes = require('./server/routes/routes')
const WebSocketServer = require('./server/net/webSocketServer')

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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)

    const wss = new WebSocketServer(wsPort, () => {
        console.log(`WebSocket server is running on port ${wsPort}`)
    }, () => {
        console.log('WebSocket server closed')
    })

    wss.start()
})

module.exports = {
    server: app,
    services: services
}
