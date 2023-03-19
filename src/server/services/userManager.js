const Service = require('./service')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')

class UserManager extends Service {
    constructor (dbPool) {
        super(dbPool)
    }

    async register (username, email, password) {
        const id = uuidv4()
        const hashedPassword = await bcrypt.hash(password, 10)
        const creationTime = new Date().toISOString().slice(0, 19).replace('T', ' ')

        const [rows, fields] = await this.dbPool.execute(
            `INSERT INTO users (id, user_name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`,
            [id, username, email, hashedPassword, creationTime]
        )

        return rows
    }
}

module.exports = UserManager
