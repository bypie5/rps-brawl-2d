const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Service = require('./service')

class Authentication extends Service {
    constructor (dbPool) {
        super(dbPool)
    }

    async validUserCredentials (username, password) {
        const [rows, fields] = await this.dbPool.execute(
            `SELECT * FROM users WHERE user_name = ?`,
            [username]
        )

        if (rows.length === 0) {
            return false
        }

        const user = rows[0]

        return await bcrypt.compare(password, user.password_hash)
    }

    async generateToken (username) {
    }
}

module.exports = Authentication