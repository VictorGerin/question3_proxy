const request = require('supertest')
const proxy = require('../proxy')
const express = require('express')

let expressServer = []

/**
 * Create a simple express server to be proxyed by the proxy
 */
function startExpress(msg) {
  return new Promise((ok, fail) => {
    const app = express()

    app.get('/', (req, res) => {
      res.send(msg)
    })

    let returnServer = app.listen(0, () => {
      ok(returnServer)
    })
  })
}

beforeAll(async () => {
  expressServer.push(await startExpress('Server 0'))
  expressServer.push(await startExpress('Server 1'))
  expressServer.push(await startExpress('Server 2'))
})

afterAll(() => {
  expressServer.forEach((server) => server.close())
})

function verifyText(res, err, text, done) {
  if (err) done(err)
  else if (res.text !== text)
    done(`Wrong response: expect '${text}' / recived : '${res.text}'`)
  else return true
}

test('router ', async () => {
  const logger = require('../logger')
  logger.silent = true

  const config = {
    baseDestination: '127.0.0.1',
    basePort: expressServer[0].address().port,
    https: false,
    sysPlugins: ['proxy', 'router'],
    router: [
      {
        url: '/page0',
        destination: '127.0.0.1',
        port: expressServer[0].address().port,
      },
      {
        url: '/page1',
        destination: '127.0.0.1',
        port: expressServer[1].address().port,
      },
      {
        url: '/page2',
        destination: '127.0.0.1',
        port: expressServer[2].address().port,
      },
    ],
  }

  let httpProxy = proxy.createServer({ config, plugins: [], logger })

  await new Promise((resolve, reject) => {
    request(httpProxy)
      .get('/')
      .expect(200)
      .end(function (err, res) {
        if (verifyText(res, err, 'Server 0', reject)) resolve()
      })
  })
  await new Promise((resolve, reject) => {
    request(httpProxy)
      .get('/page0')
      .expect(200)
      .end(function (err, res) {
        if (verifyText(res, err, 'Server 0', reject)) resolve()
      })
  })
  await new Promise((resolve, reject) => {
    request(httpProxy)
      .get('/page1')
      .expect(200)
      .end(function (err, res) {
        if (verifyText(res, err, 'Server 1', reject)) resolve()
      })
  })
  await new Promise((resolve, reject) => {
    request(httpProxy)
      .get('/page2')
      .expect(200)
      .end(function (err, res) {
        if (verifyText(res, err, 'Server 2', reject)) resolve()
      })
  })
})
