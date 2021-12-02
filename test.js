const request = require('supertest')
const proxy = require("./proxy");
const config = require("./config");

it('simple response ', (done) => {

    let httpProxy = proxy()

    request(httpProxy)
        .get('/')
        .expect(200, done)

})


