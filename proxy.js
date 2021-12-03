/**
 * Create a simple proxy server in Node. This proxy server should be capable of transparently forwarding client requests to at least one target server
 * and returning the response from the target server to the requesting client. In addition, this server should be capable of loading various code plugins
 * that extend the functionality of the proxy server. These plugins should be able to view/modify the contents of the request and response life cycle,
 * with the exact steps of this life cycle defined by you. Useful plugin ideas include things such as whitelisting/blacklisting request URLs based on
 * passed criteria, adding request logging for security purposes, filtering out specific pieces of response content, or anything else that you think could be useful.
 **/

const http = require("http");
const https = require("https");
const getAllPlugins = require("./autoLoadmodule");

function processFunctPlugins(pluginsSync, ...data) {
  return new Promise(async (resolve, reject) => {
    let current = 0;

    let selNext = async () => {
      if (current >= pluginsSync.length) {
        resolve();
        return;
      }

      let funcDefault = pluginsSync[current];

      current += 1;

      let promise = funcDefault(
        selNext,
        (whyRejected) => {
          reject({
            whoRejected: current - 1,
            whyRejected: whyRejected,
          });
        },
        ...data
      );
      if (promise instanceof Promise) {
        await promise;
      }
    };

    selNext();
  });
}

function makeProxyCall(context) {
  return new Promise((resolve, reject) => {
    let responseData = {
      headers: [],
      method: "",
      url: "",
      trailers: [],
      data: Buffer.alloc(0),
    };

    let httpModule = context.proxyed.https ? https : http;

    const newReq = httpModule.request(context.proxyed.requestData, (res) => {
      res.on("data", (d) => {
        responseData.data = Buffer.concat([responseData.data, d]);
      });

      res.on("end", () => {
        resolve({
          headers: res.headers,
          method: res.method,
          url: res.url,
          trailers: res.trailers,
          data: responseData.data,
          statusCode: res.statusCode,
        });
      });
    });

    newReq.on("error", (error) => {
      reject(error);
    });

    newReq.addTrailers(context.client.requestData.trailers);
    newReq.write(context.client.requestData.data);
    newReq.end();
  });
}

async function processRequest(context, pluginsSync, pluginsAsync) {
  try {
    //Execute all sync plugins
    await processFunctPlugins(
      pluginsSync.map((a) => a.before),
      context.proxyed.requestData,
      context
    );
  } catch (ex) {
    console.log(ex.whyRejected);
    context.hasFail = true;
    context.whyRejected = ex.whyRejected;
    //if some plugin gives a erro
    //finish the transaction
    await processFunctPlugins(
      pluginsSync.slice(0, ex.whoRejected + 1).map((a) => a.after),
      context.proxyed.requestData,
      context.client.responseData,
      context
    );
    return context.client.responseData;
  }

  //Execute all async plugins
  let afters = await Promise.all(
    pluginsAsync.map((it) => it.plugin(context.proxyed.requestData, context))
  );

  try {
    context.client.responseData = await makeProxyCall(context);
  } catch (ex) {
    return context.client.responseData;
  }

  await Promise.all(
    afters.map((it) =>
      it(context.proxyed.requestData, context.client.responseData, context)
    )
  );

  await processFunctPlugins(
    pluginsSync.reverse().map((a) => a.after),
    context.proxyed.requestData,
    context.client.responseData,
    context
  );

  return context.client.responseData;
}

module.exports = {
  createServer: function (config = {}) {
    /**
     * setting default values for the config
     **/
    Object.assign(config, {
      basePort: config.basePort ? config.basePort : config.https ? 443 : 80,
      https: false,
      overideHost: true,
      baseDestination: undefined,
      pluginsFolder: "./plugins",
      ...config,
    });

    const plugins = module.exports.getAllPlugins(config.pluginsFolder);
    const pluginsSync = plugins.filter((a) => a.priority);
    const pluginsAsync = plugins.filter((a) => !a.priority);

    return http.createServer(function (req, res) {
      let context = {
        client: {
          req: req,
          res: res,
          requestData: {
            headers: req.headers,
            method: req.method,
            url: req.url,
            trailers: req.trailers,
            data: Buffer.alloc(0),
          },
          responseData: {
            statusCode: 500,
            headers: { "content-type": "text/plain" },
            data: Buffer.alloc(0),
            trailers: {},
          },
        },
        proxyed: {
          req: null,
          res: null,
          requestData: {},
          https: config.https,
        },
        config: JSON.parse(JSON.stringify(config)),
        hasFail: false,
      };

      let requestData = context.client.requestData;

      if (config.overideHost)
        requestData.headers["host"] = config.baseDestination;

      context.proxyed.requestData = {
        hostname: config.baseDestination,
        port: config.basePort,
        path: requestData.url,
        headers: requestData.headers,
        method: requestData.method,
      };

      req.on("data", (d) => {
        requestData.data = Buffer.concat([requestData.data, d]);
      });

      req.on("end", async () => {
        let responseData = {};

        try {
          responseData = await processRequest(
            context,
            pluginsSync,
            pluginsAsync
          );
        } catch (ex) {
          res.writeHead(500, { "content-type": "text/plain" });
          res.end();
          return;
        }

        res.writeHead(responseData.statusCode, responseData.headers);
        res.addTrailers(responseData.trailers);
        res.write(responseData.data);
        res.end();
      });
    });
  },
  getAllPlugins: getAllPlugins,
};
