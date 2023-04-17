const chai = require('chai')
const chaiHttp = require('chai-http')
const sinon = require('sinon')
const WebSocket = require('ws')

const { server, services } = require('../src/index')
const msgTypes = require('../src/common/rps2dProtocol')
const commandTypes = require('../src/common/gameplayCommands')
const { directionEnum, shiftRps } = require('../src/server/ecs/util')

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

    it('Agent sending move gameplay command to session', async () => {
        const authToken = await login('test', 'test')
        const res = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                config: {
                    maxPlayers: 2,
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

        const res4 = await chai.request(server)
            .post('/api/game-session/invite-agent-to-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({
                sessionId: JSON.parse(res2.text).sessionId,
            })

        chai.expect(res4).to.have.status(200)  

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
                            && entity.Avatar.playerId.includes('-rps-brawl-agent')
                            // && entity.Transform.yVel !== 0
                        ) {
                            console.log(entity.Avatar)
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

    it('Player remains contained by barrier while moving', async () => {
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

                    let playerId = null
                    for (const [id, entity] of Object.entries(entities)) {
                        if (entity.Avatar) {
                            playerId = id
                        }
                    }
                    let player = entities[playerId]

                    // find closest barrier
                    let closestBarrier = null
                    let closestBarrierDistance = Infinity
                    for (const [id, entity] of Object.entries(entities)) {
                        if (entity.Barrier) {
                            const distance = Math.sqrt(
                                Math.pow(entity.Transform.xPos - player.Transform.xPos, 2)
                                + Math.pow(entity.Transform.yPos - player.Transform.yPos, 2)
                            )

                            if (distance < closestBarrierDistance) {
                                closestBarrier = entity
                                closestBarrierDistance = distance
                            }
                        }
                    }

                    // move player towards barrier
                    const xVel = closestBarrier.Transform.xPos - player.Transform.xPos
                    const yVel = closestBarrier.Transform.yPos - player.Transform.yPos

                    let direction = null
                    if (Math.abs(xVel) > Math.abs(yVel)) {
                        direction = xVel > 0 ? 'right' : 'left'
                    } else {
                        direction = yVel > 0 ? 'up' : 'down'
                    }

                    ws.send(JSON.stringify({
                        type: msgTypes.clientToServer.GAMEPLAY_COMMAND.type,
                        gameplayCommandType: commandTypes.MOVE,
                        payload: {
                            entityId: playerId,
                            direction
                        }
                    }))

                    // wait for player to move
                    await new Promise((resolve, reject) => {
                        setTimeout(resolve, 4500)
                    })

                    player = entities[playerId]

                    switch (direction) {
                        case 'up':
                            chai.expect(player.Transform.yPos).to.be.at.most(closestBarrier.Transform.yPos)
                            resolve()
                            break
                        case 'down':
                            chai.expect(player.Transform.yPos).to.be.at.least(closestBarrier.Transform.yPos)
                            resolve()
                            break
                        case 'left':
                            chai.expect(player.Transform.xPos).to.be.at.least(closestBarrier.Transform.xPos)
                            resolve()
                            break
                        case 'right':
                            chai.expect(player.Transform.xPos).to.be.at.most(closestBarrier.Transform.xPos)
                            resolve()
                            break
                        default:
                            reject()

                    }
                }
            })
        })

        await p
    })

    it('Cooldown prevents state changes while active', async () => {
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

        let playerStateBeforeCommandSent = null
        let tickWhenCommandSent = null
        let playerStateDuringCommandCooldown = null

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
                            && entity.Avatar.state === 'alive'
                            && tickWhenCommandSent === null
                        ) {
                            playerStateBeforeCommandSent = entity.Avatar.stateData.rockPaperScissors

                            ws.send(JSON.stringify({
                                type: msgTypes.clientToServer.GAMEPLAY_COMMAND.type,
                                gameplayCommandType: commandTypes.STATE_SHIFT_LEFT,
                                payload: {
                                    entityId: id
                                }
                            }))

                            tickWhenCommandSent = gameContext.currentTick
                        }

                        if (entity.Avatar
                            && entity.Avatar.playerId === 'test'
                            && tickWhenCommandSent) {
                            playerStateDuringCommandCooldown = entity.Avatar.stateData.rockPaperScissors
                        }

                        if (entity.Avatar
                            && entity.Avatar.playerId === 'test'
                            && entity.Avatar.stateData.stateSwitchCooldownTicks > 10
                            && tickWhenCommandSent
                            && playerStateBeforeCommandSent
                        ) {
                            // expect this command to be ignored
                            ws.send(JSON.stringify({
                                type: msgTypes.clientToServer.GAMEPLAY_COMMAND.type,
                                gameplayCommandType: commandTypes.STATE_SHIFT_LEFT,
                                payload: {
                                    entityId: id
                                }
                            }))
                        }

                        if (entity.Avatar
                            && entity.Avatar.playerId === 'test'
                            && entity.Avatar.stateData.stateSwitchCooldownTicks === 0
                            && tickWhenCommandSent
                            && playerStateDuringCommandCooldown === shiftRps(playerStateBeforeCommandSent, directionEnum.LEFT)
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
