const restify = require('restify')
const restifyJSONHAL = require('restify-json-hal')

const log = require('./services/log')
const config = require('./package')

// Load environment variables, throw error if any variables are missing
require('dotenv-safe').load({
  allowEmptyValues: true
})

// Create application
const app = module.exports = restify.createServer({
  name: config.name,
  log: log,
  version: config.version
})

// Log every incoming request
app.pre(log.onRequest)

// Parse incoming request body and query parameters
app.use(restify.bodyParser({mapParams: false}))
app.use(restify.queryParser())

// Automatically add HATEAOS relations to responses
app.use(restifyJSONHAL(app, {
  overrideJSON: true,
  makeObjects: true
}))

// Load all routes
require('./controllers/routes')(app)

// Check if application should start
if (!process.env.NO_START) {
  // Start application
  app.listen(process.env.PORT, log.onAppStart.bind(null, app))
}
