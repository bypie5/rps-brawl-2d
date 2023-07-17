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

    async doesUserExist (username) {
        const [rows, fields] = await this.dbPool.execute(
            `SELECT * FROM users WHERE user_name = ?`,
            [username]
        )

        return rows.length > 0
    }

    generateToken (username) {
        const secret = process.env.JWT_SIGNING_SECRET
        const payload = {
            username
        }
        return jwt.sign(payload, secret, {
            algorithm: 'HS256',
            expiresIn: '2h',
            issuer: 'rockpaperscissorsbrawl2d.com',
            audience: 'rockpaperscissorsbrawl2d.com',
            subject: username
        })
    }

    generateTemporaryAccessToken (anonUser) {
        const secret = process.env.JWT_SIGNING_SECRET
        const payload = {
            username: anonUser,
            temp: true
        }
        return jwt.sign(payload, secret, {
            algorithm: 'HS256',
            expiresIn: '2h',
            issuer: 'rockpaperscissorsbrawl2d.com',
            audience: 'rockpaperscissorsbrawl2d.com',
            subject: 'anonymous'
        })
    }

    getJwtClaims (token) {
        const secret = process.env.JWT_SIGNING_SECRET
        return jwt.verify(token, secret, {
            algorithms: ['HS256'],
            issuer: 'rockpaperscissorsbrawl2d.com',
            audience: 'rockpaperscissorsbrawl2d.com'
        })
    }
}

module.exports = Authentication