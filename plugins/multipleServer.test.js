const request = require('supertest')
const proxy = require('../proxy')
// const config = require("./config");
const express = require('express')
var assert = require('assert')
const http = require('http')
const { rejects } = require('assert')

let expressServers = []

/**
 * Create a simple express server to be proxyed by the proxy
 */
function startExpress(response) {
  return new Promise((ok, fail) => {
    const app = express()

    app.get('/', (req, res) => {
      res.send(response)
    })

    let returnServer = app.listen(0, () => {
      ok(returnServer)
    })
  })
}

//Remove todos os plugins
beforeAll(async () => {
  expressServers.push(await startExpress('Hello from Server1'))
  expressServers.push(await startExpress('Hello from Server2'))
  expressServers.push(await startExpress('Hello from Server3'))

  proxy.getAllPlugins = () => {
    return []
  }
})

afterAll(() => {
  expressServers.forEach((server) => {
    server.close()
  })
})

afterEach(() => {
  proxy.getAllPlugins = () => {
    return []
  }
})

beforeEach(() => {
  proxy.getAllPlugins = () => {
    return [require('./multipleServer')]
  }
})

function verifyText(res, err, done, text) {
  if (err) done(err)
  else if (res.text !== text)
    done(`Wrong response: expect "${text}" / recived : "${res.text}""`)
  else return true
}

test('Simple Get response ', (done) => {
  const config = {
    baseDestination: '127.0.0.1',
    basePort: expressServers[0].address().port,
    https: false,
    multipleServe: [],
  }
  request(proxy.createServer(config))
    .get('/')
    .expect(200)
    .end(function (err, res) {
      if (verifyText(res, err, done, 'Hello from Server1')) done()
    })
})

test('Redirection', async () => {
  const config = {
    baseDestination: '127.0.0.1',
    basePort: expressServers[0].address().port,
    https: false,
    multipleServe: [
      {
        url: '/page2',
        port: expressServers[1].address().port,
        destination: '127.0.0.1',
      },
      {
        url: '/page3',
        port: expressServers[2].address().port,
        destination: '127.0.0.1',
      },
    ],
  }

  const httpProxy = proxy.createServer(config)

  await new Promise((ok, fail) => {
    request(httpProxy)
      .get('/')
      .expect(200)
      .end(function (err, res) {
        if (verifyText(res, err, fail, 'Hello from Server1')) ok()
      })
  })

  await new Promise((ok, fail) => {
    request(httpProxy)
      .get('/page2')
      .expect(200)
      .end(function (err, res) {
        if (verifyText(res, err, fail, 'Hello from Server2')) ok()
      })
  })

  await new Promise((ok, fail) => {
    request(httpProxy)
      .get('/page3')
      .expect(200)
      .end(function (err, res) {
        if (verifyText(res, err, fail, 'Hello from Server3')) ok()
      })
  })
})
