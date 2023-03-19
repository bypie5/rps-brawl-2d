const passport = require('passport')

const gameSession = require('./gameSessionRoutes')
const user = require('./userRoutes')

module.exports = (app) => {
    app.use('/api/game-session', passport.authenticate('jwt'), gameSession)
    app.use('/api/user', user)
}