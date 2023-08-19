require('dotenv').config()
const chai = require('chai')
const services = require('../src/server/services/services')

describe('Feedback Service test', () => {
  it('Should throw an error if feedback type is invalid', async () => {
    const mockFeedback = {
      type: 'invalid',
      message: 'test'
    }

    try {
      await services.feedback.submitFeedback(mockFeedback)
    } catch (err) {
      chai.expect(err.name).to.equal('InvalidFeedbackError')
    }
  })

  it('Should throw an error if feedback message is invalid', async () => {
    const mockFeedback = {
      type: 'bug',
      message: '' // string should be at least 1 character
    }

    try {
      await services.feedback.submitFeedback(mockFeedback)
    } catch (err) {
      chai.expect(err.name).to.equal('InvalidFeedbackError')
    }
  })

  it('Should escape content if user attempts to submit dangerous characters', async () => {
    const mockFeedback = {
      type: 'bug',
      message: 'test <script>alert("bad")</script>'
    }

    const id = await services.feedback.submitFeedback(mockFeedback)
    const feedback = await services.feedback.getFeedbackById(id)

    chai.expect(feedback.message_content).to.equal('test &lt;script&gt;alert(&quot;bad&quot;)&lt;&#x2F;script&gt;')
  })

  it('Should save feedback to the database', async () => {
    const mockFeedback = {
      type: 'bug',
      message: 'test'
    }

    const id = await services.feedback.submitFeedback(mockFeedback)
    const feedback = await services.feedback.getFeedbackById(id)

    chai.expect(feedback.feedback_type_id).to.equal(1)
    chai.expect(feedback.message_content).to.equal('test')
  })
})
