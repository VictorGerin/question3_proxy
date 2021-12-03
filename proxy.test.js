const request = require("supertest");
const proxy = require("./proxy");
// const config = require("./config");
const express = require("express");
var assert = require("assert");

let expressServer;

/**
 * Create a simple express server to be proxyed by the proxy
 */
function startExpress() {
  return new Promise((ok, fail) => {
    const app = express();

    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    app.get("/header", (req, res) => {
      res.send(req.headers["teste"]);
    });

    app.post("/json", (req, res) => {
      res.json({
        prop1: "val1",
        prop2: 10.1,
        prop3: true,
      });
    });

    let returnServer = app.listen(0, () => {
      ok(returnServer);
    });
  });
}

//Remove todos os plugins
beforeAll(async () => {
  expressServer = await startExpress();

  proxy.getAllPlugins = () => {
    return [];
  };
});

afterAll(() => {
  expressServer.close();
});

afterEach(() => {
  proxy.getAllPlugins = () => {
    return [];
  };
});

function verifyText(res, err, done, text) {
  if (err) done(err);
  else if (res.text !== text)
    done(`Wrong response: expect "${text}" / recived : "${res.text}""`);
  else return true;

  return false;
}

test("Simple Get response ", (done) => {
  const config = {
    baseDestination: "127.0.0.1",
    basePort: expressServer.address().port,
    https: false,
  };

  request(proxy.createServer(config))
    .get("/")
    .expect(200)
    .end(function (err, res) {
      if (verifyText(res, err, done, "Hello World!")) done();
    });
});

test("Simple Post response ", (done) => {
  const config = {
    baseDestination: "127.0.0.1",
    basePort: expressServer.address().port,
    https: false,
  };

  request(proxy.createServer(config))
    .post("/json")
    .expect(200)
    .end(function (err, res) {
      if (
        verifyText(res, err, done, '{"prop1":"val1","prop2":10.1,"prop3":true}')
      )
        done();
    });
});

test("Sync plugin", (done) => {
  const config = {
    baseDestination: "127.0.0.1",
    basePort: expressServer.address().port,
    https: false,
  };

  proxy.getAllPlugins = () => {
    return [
      {
        priority: 1,
        before: (next, fail, req, context) => {
          req.method = "GET";
          next();
        },
        after: (next) => {
          next();
        },
      },
    ];
  };

  request(proxy.createServer(config))
    .post("/")
    .expect(200)
    .end(function (err, res) {
      if (verifyText(res, err, done, "Hello World!")) done();
    });
});

test("Async plugin", (done) => {
  const config = {
    baseDestination: "127.0.0.1",
    basePort: expressServer.address().port,
    https: false,
  };

  proxy.getAllPlugins = () => {
    return [
      {
        priority: 0,
        plugin: (req, context) => {
          req.method = "GET";
          return () => {};
        },
      },
    ];
  };

  request(proxy.createServer(config))
    .post("/")
    .expect(200)
    .end(function (err, res) {
      if (verifyText(res, err, done, "Hello World!")) done();
    });
});

test("Inject header", (done) => {
  const config = {
    baseDestination: "127.0.0.1",
    basePort: expressServer.address().port,
    https: false,
  };

  proxy.getAllPlugins = () => {
    return [
      {
        priority: 0,
        plugin: (req, context) => {
          req.headers["teste"] = "Ola mundo!";
          return () => {};
        },
      },
    ];
  };

  expect;

  request(proxy.createServer(config))
    .get("/header")
    .expect(200)
    .end(function (err, res) {
      if (verifyText(res, err, done, "Ola mundo!")) done();
    });
});

test("Sync plugin order", (done) => {
  const config = {
    baseDestination: "127.0.0.1",
    basePort: expressServer.address().port,
    https: false,
  };

  proxy.getAllPlugins = () => {
    return [
      {
        priority: 2,
        //1º to execute
        before: (next, fail, req, context) => {
          if (
            context.before2 ||
            context.after2 ||
            context.before1 ||
            context.after1
          )
            fail();
          context.before2 = true;
          next();
        },
        //4º to execute and last
        after: (next, fail, req, res, context) => {
          if (
            !context.before2 ||
            context.after2 ||
            !context.before1 ||
            !context.after1
          )
            fail();
          context.after2 = true;
          next();
        },
      },
      {
        priority: 1,
        //2º to execute
        before: (next, fail, req, context) => {
          if (
            !context.before2 ||
            context.after2 ||
            context.before1 ||
            context.after1
          )
            fail();
          context.before1 = true;
          next();
        },
        //3º to execute
        after: (next, fail, req, res, context) => {
          if (
            !context.before2 ||
            context.after2 ||
            !context.before1 ||
            context.after1
          )
            fail();
          context.after1 = true;
          next();
        },
      },
    ];
  };

  request(proxy.createServer(config))
    .get("/")
    .expect(200)
    .end(function (err, res) {
      if (verifyText(res, err, done, "Hello World!")) done();
    });
});
