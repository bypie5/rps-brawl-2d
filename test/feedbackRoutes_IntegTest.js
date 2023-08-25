const chai = require('chai')
const chaiHttp = require('chai-http')

const { server } = require('../src/index')

chai.use(chaiHttp)
describe('Testing Feedback Routes', () => {
  it('should return 200 on successful feedback submission', async () => {
    const res = await chai.request(server)
      .post('/api/feedback/submit')
      .set('content-type', 'application/json')
      .send({
        feedback: {
          type: 'bug',
          message: 'test'
        }
      })

    chai.expect(res).to.have.status(200)
  })

  it('should return 400 on invalid feedback submission', async () => {
    const res = await chai.request(server)
      .post('/api/feedback/submit')
      .set('content-type', 'application/json')
      .send({
        feedback: {
          type: 'invalid',
          message: 'test'
        }
      })

    chai.expect(res).to.have.status(400)
  })
})