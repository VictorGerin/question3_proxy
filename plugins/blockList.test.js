const request = require('supertest')
const proxy = require("../proxy");
// const config = require("./config");
const express = require('express')
var assert = require('assert');

let expressServer1;

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
    expressServer1 = await startExpress('Hello from Server');

    proxy.getAllPlugins = () => {
        return []
    }
});

afterAll(() => {
    expressServer1.close();
})

afterEach(() => {

    proxy.getAllPlugins = () => {
        return [
        ]
    }
})


function verifyText(res, err, done, text)
{
    if (err)
        done(err);
    else if(res.text !== text)
        done(`Wrong response: expect "${text}" / recived : "${res.text}""`)
    else
        return true
}

test('block list', async () => {
    
    proxy.getAllPlugins = () => {
        return [
            require('./blockList')
        ]
    }

    const config = {
        baseDestination: '127.0.0.1',
        basePort: expressServer1.address().port,
        https: false,
        blocklist: [
            "::ffff:127.0.0.1"
        ]
    };

    await new Promise((ok, fail) => {
        request(proxy.createServer(config))
        .get('/')
        .expect(403, (err) => {
            if(err) fail(err)
            else ok();
        })
    }) 
    
    delete config.blocklist

    await new Promise((ok, fail) => {
        request(proxy.createServer(config))
        .get('/')
        .expect(200)
        .end(function(err, res) {
            if(verifyText(res, err, fail, 'Hello from Server')) ok()
        });
    })
})
