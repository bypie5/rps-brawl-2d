const express = require('express')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const path = require('path')

require('dotenv').config()

const services = require('./server/services/services')
const registerRoutes = require('./server/routes/routes')

const app = express()
const port = 8080

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
            console.log(isValid)
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

registerRoutes(app)

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})
