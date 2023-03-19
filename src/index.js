const express = require('express')
const path = require('path')

require('dotenv').config()

const registerRoutes = require('./server/routes/routes')

const app = express()
app.use(express.json())
const port = 8080

app.use(express.static(path.join(__dirname, 'gameview/public')))
registerRoutes(app)

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})
