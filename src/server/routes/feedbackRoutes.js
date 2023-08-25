const express = require('express')
const router = express.Router()

const services = require('../services/services')

router.post('/submit', async (req, res) => {
  const { feedback } = req.body

  try {
    await services.feedback.submitFeedback(feedback)
    res.status(200).send('Feedback submitted')
    console.log(`Feedback submitted: ${feedback.type}`)
  } catch (err) {
    if (err.name === 'InvalidFeedbackError') {
      res.status(400).send('Invalid feedback')
    } else {
      res.status(500).send('Internal server error')
    }
  }
})

module.exports = router
