const request = require('supertest')
const proxy = require('../proxy')
const express = require('express')
const { TestWatcher } = require('@jest/core')

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

test('block list', async () => {
  const logger = require('../logger')
  logger.silent = true

  const config = {
    baseDestination: 'localhost',
    basePort: expressServer[0].address().port,
    https: false,
    sysPlugins: ['proxy', 'blockList'],
    blocklist: ['::1', '::ffff:127.0.0.1'],
  }

  let httpProxy = proxy.createServer({ config, plugins: [], logger })

  await new Promise((resolve, reject) => {
    request(httpProxy)
      .get('/')
      .expect(403)
      .end(function (err, res) {
        if (err) reject(err)

        resolve()
      })
  })

  delete config.blocklist

  httpProxy = proxy.createServer({ config, plugins: [], logger })

  await new Promise((resolve, reject) => {
    request(httpProxy)
      .get('/')
      .expect(200)
      .end(function (err, res) {
        if (verifyText(res, err, 'Server 0', reject)) resolve()
      })
  })
})
