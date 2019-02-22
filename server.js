const express = require('express')
const app = express()
const port = 3030

app.use(express.static('example'))

app.listen(port, () => console.log(`Punch List app listening on port ${port}!`));