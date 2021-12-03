const request = require('supertest')
const proxy = require("../proxy");
// const config = require("./config");
const express = require('express')
var assert = require('assert');

let expressServer1;
let expressServer2;

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
    expressServer1 = await startExpress('Hello from Server1');
    expressServer2 = await startExpress('Hello from Server2');

    proxy.getAllPlugins = () => {
        return []
    }
});

afterAll(() => {
    expressServer1.close();
    expressServer2.close();
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

test('Simple Get response ', (done) => {
    
    proxy.getAllPlugins = () => {
        return [
            require('./multipleServer')
        ]
    }

    const config = {
        baseDestination: '127.0.0.1',
        basePort: expressServer1.address().port,
        https: false,
        multipleServe: []
    };

    request(proxy.createServer(config))
    .get('/')
    .expect(200)
    .end(function(err, res) {
        if(verifyText(res, err, done, 'Hello from Server1')) done()
    });

    

})

test('Redirection', async () => {
    
    proxy.getAllPlugins = () => {
        return [
            require('./multipleServer')
        ]
    }

    const config = {
        baseDestination: '127.0.0.1',
        basePort: expressServer1.address().port,
        https: false,
        multipleServe: [
            {
                url:'/page2',
                port: expressServer2.address().port,
                destination: '127.0.0.1'
            }
        ]
    };

    await new Promise((ok, fail) => {
        request(proxy.createServer(config))
        .get('/')
        .expect(200)
        .end(function(err, res) {
            if(verifyText(res, err, fail, 'Hello from Server1')) ok();
        });
    })

    await new Promise((ok, fail) => {
        request(proxy.createServer(config))
        .get('/page2')
        .expect(200)
        .end(function(err, res) {
            if(verifyText(res, err, fail, 'Hello from Server2')) ok()
        });
    })
})
