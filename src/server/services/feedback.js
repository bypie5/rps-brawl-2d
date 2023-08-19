const validator = require('validator')
const { v4: uuidv4 } = require('uuid')

const Service = require('./service')
const { v, userFeedbackSchema } = require('../schemas')

class InvalidFeedbackError extends Error {
  constructor(message) {
    super(message)
    this.name = 'InvalidFeedbackError'
  }
}

class Feedback extends Service {
  constructor (dbPool) {
    super(dbPool)
  }

  /**
   * Saves feedback to the database
   * @param feedback - feedback object
   * @returns {Promise<number>} - id of the feedback record
   * @throws {InvalidFeedbackError} - if feedback is invalid or malformed
   */
  async submitFeedback (feedback) {
    const sanitizedFeedback = this._checkFeedback(feedback)

    return await this._saveFeedback(sanitizedFeedback)
  }

  async getFeedbackById (id) {
    const [rows, fields] = await this.dbPool.execute(
      `SELECT * FROM feedback WHERE id = ?`,
      [id]
    )

    if (rows.length === 0) {
      return null
    }

    return rows[0]
  }

  async _getFeedbackTypeId (feedbackType) {
    const [rows, fields] = await this.dbPool.execute(
      `SELECT id from feedback_types_enum WHERE feedback_type = ?`,
      [feedbackType]
    )

    if (rows.length === 0) {
      throw new InvalidFeedbackError('Invalid feedback type')
    }

    return rows[0].id
  }

  async _saveFeedback (feedback) {
    const feedbackTypeId = await this._getFeedbackTypeId(feedback.type)

    const [rows, fields] = await this.dbPool.execute(
      `INSERT INTO feedback (id, feedback_type_id, message_content) VALUES (?, ?, ?)`,
      [uuidv4(), feedbackTypeId, feedback.message]
    )

    return rows.insertId
  }

  _checkFeedback (feedback) {
    this._validateFeedback(feedback)
    return this._sanitizeFeedback(feedback)
  }

  _validateFeedback (feedback) {
    const valid = v.validate(feedback, userFeedbackSchema)
    if (!valid || valid.errors.length > 0) {
      throw new InvalidFeedbackError('Invalid feedback')
    }
  }

  _sanitizeFeedback (feedback) {
    return {
      ...feedback,
      message: validator.escape(feedback.message)
    }
  }
}

module.exports = Feedback
