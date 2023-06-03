const chai = require('chai')
const chaiHttp = require('chai-http')
const sinon = require('sinon')
const WebSocket = require('ws')

const { server, services } = require('../src/index')
const msgTypes = require('../src/common/rps2dProtocol')

chai.use(chaiHttp)

async function login (username, password) {
    const res = await chai.request(server)
        .post('/api/user/login')
        .set('content-type', 'application/json')
        .send({
            username,
            password
        })

    return res.body.authToken
}

describe('Testing Game Session Routes', () => {

    beforeEach(async () => {
        services.sessionManager.clearSessions()
        sinon.stub(services.authentication, 'validUserCredentials').returns(true)
    })

    afterEach(() => {
        services.authentication.validUserCredentials.restore()
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
                    map: "map0",
                    gameMode: "elimination"
                }
            })

        chai.expect(res).to.have.status(200)
        chai.expect(res.text).to.be.a('string')
        chai.expect(res.text).to.contain('friendlyName')
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
                    map: "map0",
                    gameMode: "elimination"
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

    it('Player can connect WebSocket client after calling /join-private-session', async () => {
        const authToken = await login('test', 'test')
        const res = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                config: {
                    maxPlayers: 2,
                    map: "map0",
                    gameMode: "elimination"
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
            ws.on('message', (data) => {
                // does player receive WELCOME message?
                const msg = JSON.parse(data)
                if (msgTypes.serverToClient.WELCOME.type === msg.type) {
                    resolve()
                }
            })
        })

        await p
        ws.close()
    })

    it('MATCH_STARTED message is sent to all players when host starts match', async () => {
        const authToken = await login('test', 'test')
        const authToken2 = await login('test2', 'test2')
        const res = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                config: {
                    maxPlayers: 2,
                    map: "map0",
                    gameMode: "elimination"
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

        const res3 = await chai.request(server)
            .post('/api/game-session/join-private-session')
            .set('Authorization', `Bearer ${authToken2}`)
            .set('content-type', 'application/json')
            .send({
                friendlyName
            })

        chai.expect(res2).to.have.status(200)
        chai.expect(res2.text).to.be.a('string')
        chai.expect(res2.text).to.contain('sessionId')

        chai.expect(res3).to.have.status(200)
        chai.expect(res3.text).to.be.a('string')
        chai.expect(res3.text).to.contain('sessionId')

        const sessionId = JSON.parse(res2.text).sessionId

        const ws = new WebSocket("ws://localhost:8081", {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })

        const ws2 = new WebSocket("ws://localhost:8081", {
            headers: {
                'Authorization': `Bearer ${authToken2}`
            }
        })

        ws.on('open', () => {
            ws.send(JSON.stringify({
                type: msgTypes.clientToServer.CONNECT_TO_SESSION.type,
                sessionId,
                friendlyName
            }))
        })

        ws2.on('open', () => {
            ws2.send(JSON.stringify({
                type: msgTypes.clientToServer.CONNECT_TO_SESSION.type,
                sessionId,
                friendlyName
            }))
        })

        const p = new Promise((resolve, reject) => {
            ws.on('message', async (data) => {
                const msg = JSON.parse(data)
                if (msgTypes.serverToClient.WELCOME.type === msg.type) {
                    const res4 = await chai.request(server)
                        .post('/api/game-session/start-session?sessionId=' + sessionId)
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('content-type', 'application/json')
                        .send({})

                    chai.expect(res4).to.have.status(200)
                }

                // does player receive MATCH_STARTED message?
                if (msgTypes.serverToClient.MATCH_STARTED.type === msg.type) {
                    resolve()
                }
            })
        })

        const p2 = new Promise((resolve, reject) => {
            ws2.on('message', (data) => {
                // does player receive MATCH_STARTED message?
                const msg = JSON.parse(data)
                if (msgTypes.serverToClient.MATCH_STARTED.type === msg.type) {
                    resolve()
                }
            })
        })

        await p
        await p2
    })

    it('Agent can be invited to a match', async () => {
        const authToken = await login('test', 'test')
        const authToken2 = await login('test2', 'test2')
        const res = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                config: {
                    maxPlayers: 3,
                    map: "map0",
                    gameMode: "elimination"
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

        const res3 = await chai.request(server)
            .post('/api/game-session/join-private-session')
            .set('Authorization', `Bearer ${authToken2}`)
            .set('content-type', 'application/json')
            .send({
                friendlyName
            })
        
        const res4 = await chai.request(server)
            .post('/api/game-session/invite-agent-to-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                sessionId: JSON.parse(res2.text).sessionId,
            })

        chai.expect(res4).to.have.status(200)  

        chai.expect(res2).to.have.status(200)
        chai.expect(res2.text).to.be.a('string')
        chai.expect(res2.text).to.contain('sessionId')

        chai.expect(res3).to.have.status(200)
        chai.expect(res3.text).to.be.a('string')
        chai.expect(res3.text).to.contain('sessionId')

        const sessionId = JSON.parse(res2.text).sessionId

        const ws = new WebSocket("ws://localhost:8081", {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })

        const ws2 = new WebSocket("ws://localhost:8081", {
            headers: {
                'Authorization': `Bearer ${authToken2}`
            }
        })

        ws.on('open', () => {
            ws.send(JSON.stringify({
                type: msgTypes.clientToServer.CONNECT_TO_SESSION.type,
                sessionId,
                friendlyName
            }))
        })

        ws2.on('open', () => {
            ws2.send(JSON.stringify({
                type: msgTypes.clientToServer.CONNECT_TO_SESSION.type,
                sessionId,
                friendlyName
            }))
        })

        const p = new Promise((resolve, reject) => {
            ws.on('message', async (data) => {
                const msg = JSON.parse(data)
                if (msgTypes.serverToClient.WELCOME.type === msg.type) {
                    const res4 = await chai.request(server)
                        .post('/api/game-session/start-session?sessionId=' + sessionId)
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('content-type', 'application/json')
                        .send({})

                    chai.expect(res4).to.have.status(200)
                }

                // does player receive MATCH_STARTED message?
                if (msgTypes.serverToClient.MATCH_STARTED.type === msg.type) {
                    resolve()
                }
            })
        })

        const p2 = new Promise((resolve, reject) => {
            ws2.on('message', (data) => {
                // does player receive MATCH_STARTED message?
                const msg = JSON.parse(data)
                if (msgTypes.serverToClient.MATCH_STARTED.type === msg.type) {
                    resolve()
                }
            })
        })

        await p
        await p2
    })
})
