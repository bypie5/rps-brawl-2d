const chai = require('chai')
const chaiHttp = require('chai-http')
const sinon = require('sinon')

const { server, services } = require('../src/index')

chai.use(chaiHttp)

describe('Testing User Routes', () => {
    it('user receives jwt token on successful login', async () => {
        sinon.stub(services.authentication, 'validUserCredentials').returns(true)

        const res = await chai.request(server)
            .post('/api/user/login')
            .set('content-type', 'application/json')
            .send({
                username: 'test',
                password: 'test'
            })

        // TODO: restore login function test after open beta
        // TODO: restore mock login function in gameSessionRoutes_IntegTest.js and playerControls_IntegTest.js
        chai.expect(res).to.have.status(401)
        // chai.expect(res).to.have.status(200)
        // chai.expect(res.body).to.be.a('object')
        // chai.expect(res.body).to.have.property('authToken')

        // services.authentication.validUserCredentials.restore()
    })
})
