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

test('Auth test', async () => {
  const logger = require('../logger')
  logger.silent = true

  let User = Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substr(0, 6)
  let Pass = Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substr(0, 6)

  const config = {
    baseDestination: 'localhost',
    basePort: expressServer[0].address().port,
    https: false,
    sysPlugins: ['proxy', 'auth'],
    lstUsers: {},
  }

  config.lstUsers[User] = Pass

  let httpProxy = proxy.createServer({ config, plugins: [], logger })

  await new Promise((resolve, reject) => {
    request(httpProxy)
      .get('/')
      .expect(401)
      .end(function (err, res) {
        if (err) reject(err)

        resolve()
      })
  })

  httpProxy = proxy.createServer({ config, plugins: [], logger })

  await new Promise((resolve, reject) => {
    request(httpProxy)
      .get('/')
      .set({
        authorization:
          'Basic ' + Buffer.from(`${User}:${Pass}`).toString('base64'),
      })
      .expect(200)
      .end(function (err, res) {
        if (verifyText(res, err, 'Server 0', reject)) resolve()
      })
  })
})
