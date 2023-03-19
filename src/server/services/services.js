const mysql = require('mysql2/promise')
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'rps'
})

const SessionManager = require('./sessionManager')
const UserManager = require('./userManager')

function initServices (dbPool) {
    return {
        sessionManager: new SessionManager(dbPool),
        userManager: new UserManager(dbPool)
    }
}
const services = initServices(pool)

module.exports = services
