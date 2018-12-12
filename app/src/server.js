import summariseLSA from './summariseLSA'
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const unfluff = require('unfluff')
//const summariseLSA = require('./summariseLSA')
const app = express()

// create application/json parser
const jsonParser = bodyParser.json()
const textParser = bodyParser.text({ limit: '2mb' })

app.set('port', (process.env.PORT || 8080))
app.use(express.static(__dirname + '/public'))
app.use(cors())

app.get('/', function(request, response) {
  response.send('Hello World!')
})

app.post('/unfluff', textParser, (req, res) => {
  let unfluffed = unfluff.lazy(req.body, 'en')
  let reponse = { title: unfluffed.title(), body: unfluffed.text() }
  res.send(reponse)
})

app.post('/summariseLSA', jsonParser, (req, res) => {
  let summarised = summariseLSA(req.body.text, req.body.length)
  res.send(summarised)
})

app.listen(app.get('port'), function() {
  //console.log("Node app is running at localhost:" + app.get('port'))
})
