const mysql = require('mysql2/promise')
const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'rps'
})

const SessionManager = require('./sessionManager')
const UserManager = require('./userManager')
const Authentication = require('./authentication')

function initServices (dbPool) {
    return {
        sessionManager: new SessionManager(dbPool),
        userManager: new UserManager(dbPool),
        authentication: new Authentication(dbPool)
    }
}
const services = initServices(pool)

module.exports = services
