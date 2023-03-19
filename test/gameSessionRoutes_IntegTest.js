const chai = require('chai')
const chaiHttp = require('chai-http')
const sinon = require('sinon')

const { server, services } = require('../src/index')

chai.use(chaiHttp)

async function login (username, password) {
    sinon.stub(services.authentication, 'validUserCredentials').returns(true)

    const res = await chai.request(server)
        .post('/api/user/login')
        .set('content-type', 'application/json')
        .send({
            username: 'test',
            password: 'test'
        })
    services.authentication.validUserCredentials.restore()
    return res.body.authToken
}

describe('Testing Game Session Routes', () => {

    beforeEach(async () => {
        services.sessionManager.clearSessions()
    })
    
    it('should create a private game session', async () => {
        const authToken = await login('test', 'test')
        const res = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({})

        chai.expect(res).to.have.status(200)
        chai.expect(res.text).to.be.a('string')
        chai.expect(res.text).to.equal('Private session created')
    })

    it('prevents user from hosting match if they are already hosting a match', async () => {
        const authToken = await login('test', 'test')
        const res = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({})

        chai.expect(res).to.have.status(200)

        const res2 = await chai.request(server)
            .post('/api/game-session/create-private-session')
            .set('Authorization', `Bearer ${authToken}`)
            .set('content-type', 'application/json')
            .send({})

        chai.expect(res2).to.have.status(400)
        chai.expect(res2.text).to.be.a('string')
        chai.expect(res2.text).to.equal('User already has a private session')
    })
})
