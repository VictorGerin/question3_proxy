const request = require('supertest')
const proxy = require('./proxy')
const express = require('express')
const logger = require('./logger')

logger.silent = true
let expressServer
let config

/**
 * Create a simple express server to be proxyed by the proxy
 */
function startExpress() {
  return new Promise((ok, fail) => {
    const app = express()

    app.get('/', (req, res) => {
      res.send('Hello World!')
    })

    app.get('/header', (req, res) => {
      res.send(req.headers['teste'])
    })

    app.post('/json', (req, res) => {
      res.json({
        prop1: 'val1',
        prop2: 10.1,
        prop3: true,
      })
    })

    let returnServer = app.listen(0, () => {
      ok(returnServer)
    })
  })
}

beforeAll(async () => {
  expressServer = await startExpress()
})

afterAll(() => {
  expressServer.close()
})

beforeEach(() => {
  config = {
    baseDestination: '127.0.0.1',
    basePort: expressServer.address().port,
    https: false,
    sysPlugins: ['proxy'],
  }
})

function verifyText(res, err, done, text) {
  if (err) done(err)
  else if (res.text !== text)
    done(`Wrong response: expect '${text}' / recived : '${res.text}'`)
  else return true

  return false
}

test('Simple Get response ', (done) => {
  request(proxy.createServer({ config, plugins: [], logger }))
    .get('/')
    .expect(200)
    .end(function (err, res) {
      if (verifyText(res, err, done, 'Hello World!')) done()
    })
})

test('Simple Post response ', (done) => {
  request(proxy.createServer({ config, plugins: [], logger }))
    .post('/json')
    .expect(200)
    .end(function (err, res) {
      if (
        verifyText(res, err, done, '{"prop1":"val1","prop2":10.1,"prop3":true}')
      )
        done()
    })
})

test('plugin', (done) => {
  let plugins = [
    {
      priority: 1,
      plugin: (req, context, logger) => {
        req.method = 'GET'
      },
    },
  ]

  request(proxy.createServer({ config, plugins, logger }))
    .post('/')
    .expect(200)
    .end(function (err, res) {
      if (verifyText(res, err, done, 'Hello World!')) done()
    })
})

test('plugin change body', (done) => {
  const testData = 'Ola mundo!'

  let plugins = [
    {
      priority: 1,
      plugin: () => (req, res, context, logger) => {
        res.data = testData
        res.headers['content-length'] = res.data.length
      },
    },
  ]

  request(proxy.createServer({ config, plugins, logger }))
    .get('/')
    .expect(200)
    .end(function (err, res) {
      if (verifyText(res, err, done, testData)) done()
    })
})

test('Inject header', (done) => {
  const testData = 'Ola mundo!'

  let plugins = [
    {
      priority: 1,
      plugin: (req, context, logger) => {
        req.headers['teste'] = testData
      },
    },
  ]

  request(proxy.createServer({ config, plugins, logger }))
    .get('/header')
    .expect(200)
    .end(function (err, res) {
      if (verifyText(res, err, done, testData)) done()
    })
})

test('Sync plugin order', (done) => {
  let plugins = [
    {
      priority: 2,

      plugin: (req, context, logger) => {
        //1º to execute
        if (
          context.before2 ||
          context.after2 ||
          context.before1 ||
          context.after1
        )
          throw 'Err'
        context.before2 = true

        //4º to execute and last
        return () => {
          if (
            !context.before2 ||
            context.after2 ||
            !context.before1 ||
            !context.after1
          )
            throw 'Err'
          context.after2 = true
        }
      },
    },
    {
      priority: 1,
      plugin: async (req, context, logger) => {
        //2º to execute
        if (
          !context.before2 ||
          context.after2 ||
          context.before1 ||
          context.after1
        )
          throw 'Err'
        context.before1 = true

        return async () => {
          //3º to execute
          if (
            !context.before2 ||
            context.after2 ||
            !context.before1 ||
            context.after1
          )
            throw 'Err'
          context.after1 = true
        }
      },
    },
  ]

  request(proxy.createServer({ config, plugins, logger }))
    .get('/')
    .expect(200)
    .end(function (err, res) {
      if (verifyText(res, err, done, 'Hello World!')) done()
    })
})
