const chai = require('chai')
const chaiHttp = require('chai-http')
const sinon = require('sinon')
const WebSocket = require('ws')

const { server, services } = require('../src/index')
const msgTypes = require('../src/common/rps2dProtocol')
const commandTypes = require('../src/common/gameplayCommands')

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

describe('Testing situations around gameplay commands', () => {

    beforeEach(async () => {
        services.sessionManager.clearSessions()
        sinon.stub(services.authentication, 'validUserCredentials').returns(true)
    })

    afterEach(() => {
        services.authentication.validUserCredentials.restore()
    })

    it('Sending move gameplay command to session', async () => {
        const authToken = await login('test', 'test')
        const res = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                config: {
                    maxPlayers: 1,
                    map: "map0"
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

                if (msgTypes.serverToClient.GAMESTATE_UPDATE.type === msg.type) {
                    const gameContext = msg.gameContext
                    const { entities } = gameContext

                    for (const [id, entity] of Object.entries(entities)) {
                        if (entity.Avatar
                            && entity.Avatar.playerId === 'test'
                            && entity.Transform.yVel === 0) {
                            ws.send(JSON.stringify({
                                type: msgTypes.clientToServer.GAMEPLAY_COMMAND.type,
                                gameplayCommandType: commandTypes.MOVE,
                                payload: {
                                    entityId: id,
                                    direction: 'up'
                                }
                            }))
                            ws.send(JSON.stringify({
                                type: msgTypes.clientToServer.GAMEPLAY_COMMAND.type,
                                gameplayCommandType: commandTypes.MOVE,
                                payload: {
                                    entityId: id,
                                    direction: 'right'
                                }
                            }))
                        }

                        if (entity.Avatar
                            && entity.Avatar.playerId === 'test'
                            && entity.Transform.yVel !== 0
                        ) {
                            resolve()
                        }
                    }
                }
            })
        })

        await p
    })

    it('Player respawns at random point at match start', async () => {
        const authToken = await login('test', 'test')
        const res = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                config: {
                    maxPlayers: 1,
                    map: "map0"
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

                if (msgTypes.serverToClient.GAMESTATE_UPDATE.type === msg.type) {
                    const gameContext = msg.gameContext
                    const { entities } = gameContext
                    for (const [id, entity] of Object.entries(entities)) {
                        if (entity.Avatar
                            && entity.Avatar.state === 'alive'
                            && (entity.Transform.xPos !== 0
                            || entity.Transform.yPos !== 0)
                        ) {
                            resolve()
                        }
                    }
                }
            })
        })

        await p
    })
})
