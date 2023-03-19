const msgTypes = require('../../common/rps2dProtocol')
const { v } = require('../../server/schemas')

const services = require('../services/services')

function handleMessage (ws, message) {
    const msg = JSON.parse(message)
    const msgType = msgTypes.clientToServer[msg.type]

    if (msgType === undefined) {
        console.log('Unknown message type: ' + msg.type)
        return
    }

    const validationResult = v.validate(msg, msgType.schema)
    if (!validationResult.valid) {
        console.log('Invalid message: ' + validationResult.errors)
        return
    }

    console.log('Received message: ' + msg.type)
    console.log(msg)
}

module.exports = handleMessage
