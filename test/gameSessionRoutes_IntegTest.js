const chai = require('chai')
const chaiHttp = require('chai-http')
const sinon = require('sinon')
const WebSocket = require('ws')

const { server, services } = require('../src/index')
const msgTypes = require('../src/common/rps2dProtocol')

chai.use(chaiHttp)

async function login (username, password) {
    sinon.stub(services.authentication, 'validUserCredentials').returns(true)

    const res = await chai.request(server)
        .post('/api/user/login')
        .set('content-type', 'application/json')
        .send({
            username,
            password
        })
    services.authentication.validUserCredentials.restore()
    return res.body.authToken
}

describe('Testing Game Session Routes', () => {

    beforeEach(async () => {
        services.sessionManager.clearSessions()
    })

    it('host must provide valid config object', async () => {
        const authToken = await login('test', 'test')
        const res = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({})

        chai.expect(res).to.have.status(400)
        chai.expect(res.text).to.be.a('string')
        chai.expect(res.text).to.equal('Missing session config')

        const res2 = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                config: {
                    dne: 'dne'
                }
            })

        chai.expect(res2).to.have.status(400)
        chai.expect(res2.text).to.be.a('string')
        chai.expect(res2.text).to.equal('Invalid session config')
    })
    
    it('should create a private game session', async () => {
        const authToken = await login('test', 'test')
        const res = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                config: {
                    maxPlayers: 2,
                }
            })

        chai.expect(res).to.have.status(200)
        chai.expect(res.text).to.be.a('string')
        chai.expect(res.text).to.contain('friendlyName')
    })

    it('prevents user from hosting match if they are already hosting a match', async () => {
        const authToken = await login('test', 'test')
        const res = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                config: {
                    maxPlayers: 2,
                }
            })

        chai.expect(res).to.have.status(200)

        const res2 = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                config: {
                    maxPlayers: 2,
                }
            })

        chai.expect(res2).to.have.status(400)
        chai.expect(res2.text).to.be.a('string')
        chai.expect(res2.text).to.equal('User already has a private session')
    })

    it('players can use friendly name to join private game session', async () => {
        const authToken = await login('test', 'test')
        const res = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                config: {
                    maxPlayers: 2,
                }
            })

        chai.expect(res).to.have.status(200)
        chai.expect(res.text).to.be.a('string')

        const friendlyName = JSON.parse(res.text).friendlyName

        const res2 = await chai.request(server)
            .post('/api/game-session/join-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                friendlyName
            })

        chai.expect(res2).to.have.status(200)
        chai.expect(res2.text).to.be.a('string')
        chai.expect(res2.text).to.contain('sessionId')

        const sessionId = JSON.parse(res2.text).sessionId

        const res3 = await chai.request(server)
            .get(`/api/game-session/session-info?sessionId=${sessionId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')

        chai.expect(res3).to.have.status(200)
        chai.expect(res3.text).to.be.a('string')
        chai.expect(res3.text).to.contain('id')
        chai.expect(res3.text).to.contain('"host":"test"')
    })

    it('Player can join session with /join-private-session and WebSocket client', async () => {
        const authToken = await login('test', 'test')
        const res = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                config: {
                    maxPlayers: 2,
                }
            })

        chai.expect(res).to.have.status(200)
        chai.expect(res.text).to.be.a('string')

        const friendlyName = JSON.parse(res.text).friendlyName

        const res2 = await chai.request(server)
            .post('/api/game-session/join-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                friendlyName
            })

        chai.expect(res2).to.have.status(200)
        chai.expect(res2.text).to.be.a('string')
        chai.expect(res2.text).to.contain('sessionId')

        const sessionId = JSON.parse(res2.text).sessionId

        const ws = new WebSocket("ws://localhost:8081", {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })

        ws.on('open', () => {
            ws.send(JSON.stringify({
                type: msgTypes.clientToServer.CONNECT_TO_SESSION.type,
                sessionId,
                friendlyName
            }))
        })

        const p = new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve()
            }, 1000)
        })

        await p
    })
})
