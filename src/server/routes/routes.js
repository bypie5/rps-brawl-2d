const gameSession = require('./gameSessionRoutes')
const user = require('./userRoutes')

module.exports = (app) => {
    app.use('/api/game-session', gameSession)
    app.use('/api/user', user)
}