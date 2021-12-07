/**
 * Create a simple proxy server in Node. This proxy server should be capable of transparently forwarding client requests to at least one target server
 * and returning the response from the target server to the requesting client. In addition, this server should be capable of loading various code plugins
 * that extend the functionality of the proxy server. These plugins should be able to view/modify the contents of the request and response life cycle,
 * with the exact steps of this life cycle defined by you. Useful plugin ideas include things such as whitelisting/blacklisting request URLs based on
 * passed criteria, adding request logging for security purposes, filtering out specific pieces of response content, or anything else that you think could be useful.
 **/

const http = require('http')
const getAllPlugins = require('./autoLoadPlugins')

async function processPlguins(plugins, logger, funct, ...data) {
  let returnsFunctions = []

  /**
   * Execute each group in parralel
   */
  for (const pluginGroup of plugins) {
    logger.verbose(`Executing plugin group '${pluginGroup.priority}'`)

    /**
     * each plugin in this group can fail
     * each fail reason will be store here
     */
    let fail = []
    let promiseReturn = []

    //start all
    for (const p of pluginGroup.plugins) {
      try {
        logger.verbose(`Executing plugin '${p.file}'`)
        logger.debug(`Executing plugin data`, ...data)

        let executed = p[funct](...data)

        //if this is async handle the error
        if (executed instanceof Promise) {
          executed.catch((why) =>
            fail.push({
              Whyfail: why,
              WhoFail: p.file,
            }),
          )
        }

        //if was a sync execution filter it if was
        //a result or not
        if (executed)
          promiseReturn.push({
            ...p,
            plugin: executed,
          })
      } catch (ex) {
        fail.push(ex)
      }
    }

    //wait each execution
    for (const p of promiseReturn) {
      p.plugin = await p.plugin
    }

    //Filter out all functions that has no return and is not a function
    promiseReturn = promiseReturn.filter((a) => a.plugin instanceof Function)

    //if some or all functions return another function add it in list
    if (promiseReturn.length) {
      returnsFunctions.push({
        priority: pluginGroup.priority,
        plugins: promiseReturn,
      })
    }

    /**
     * if this group has fail stop execution
     * return fail
     */
    if (fail.length)
      throw {
        PriorityFail: pluginGroup.priority,
        ...fail,
        returnsFunctions,
      }
  }

  return returnsFunctions
}

/**
 * Process the user request pass it in all plugins in order and than in reveser order
 */
async function processRequest(context, logger, plugins) {
  let returns = []
  try {
    logger.verbose('Start execute plugins before')
    //Execute the request in order
    returns = await processPlguins(
      plugins,
      logger,
      'plugin',
      context.proxyed.requestData,
      context,
      logger,
    )
  } catch (ex) {
    logger.warn('A error occurred when executing plugin', ex)

    if (ex.returnsFunctions)
      await processPlguins(
        ex.returnsFunctions.reverse(),
        logger,
        'plugin',
        context.proxyed.requestData,
        context.proxyed.responseData,
        context,
        logger,
        ex,
      )

    return
  }

  try {
    logger.verbose('Start execute plugins after')
    //execute in reverse ordem, only than that has something to be executed
    await processPlguins(
      returns.reverse(),
      logger,
      'plugin',
      context.proxyed.requestData,
      context.client.responseData,
      context,
      logger,
    )
  } catch (ex) {
    logger.warn('A Fatal Error occurred when executing plugin', returns)

    context.cliente.responseData = {
      statusCode: 500,
      headers: { 'content-type': 'text/plain' },
      data: Buffer.alloc(0),
      trailers: {},
    }
  }
}

/**
 *
 * Simple groupyBy function
 *
 * @param {Object[]} arr - Array to be gruped
 * @returns a array of objects of group in orded by key
 */
function groupByPlugins(arr) {
  let gruped = arr.reduce(function (rv, x) {
    ;(rv[x.priority] = rv[x.priority] || []).push(x)
    return rv
  }, {})

  let arrayGruped = []

  let lstKeys = Object.keys(gruped).sort()

  for (const key of lstKeys) {
    arrayGruped.push({
      priority: key,
      plugins: [...gruped[key]],
    })
  }

  return arrayGruped
}

function createContext(req, res, config, logger) {
  let context = {
    client: {
      req,
      res,
      requestData: {
        headers: req.headers,
        method: req.method,
        url: req.url,
        trailers: req.trailers,
        data: Buffer.alloc(0),
      },
      responseData: {
        statusCode: 500,
        headers: { 'content-type': 'text/plain' },
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
    //make a hard copy of config
    config: JSON.parse(JSON.stringify(config)),
    hasFail: false,
    logger,
  }

  if (config.overideHost)
    context.client.requestData.headers['host'] = config.baseDestination

  context.proxyed.requestData = {
    hostname: config.baseDestination,
    port: config.basePort,
    path: context.client.requestData.url,
    headers: context.client.requestData.headers,
    method: context.client.requestData.method,
  }

  return context
}

module.exports = {
  createServer: function ({
    config = {},
    plugins = './plugins',
    port = undefined,
    logger = './logger',
  }) {
    /**
     * setting default values for the config
     **/
    config = {
      basePort: port
        ? port
        : config.basePort
        ? config.basePort
        : config.https
        ? 443
        : 80,
      https: false,
      overideHost: true,
      baseDestination: undefined,
      ...config,
    }

    logger = logger
      ? typeof logger === 'string'
        ? require(logger)
        : logger
      : console

    logger.info('Server starded')

    logger.verbose('Loading user plugins')
    plugins =
      typeof plugins === 'string' ? getAllPlugins(plugins, logger) : plugins

    logger.verbose('Loading system plugins')
    plugins = plugins.concat(
      getAllPlugins('./systemPlugins', logger).filter((plugin) => {
        return config.sysPlugins.includes(plugin.file.replace('.js', ''))
      }),
    )

    plugins = groupByPlugins(plugins)
      //order by high first lower last
      .sort((a, b) => b.priority - a.priority)

    return http.createServer((req, res) => {
      logger.info('Request recived from : ' + req.socket.remoteAddress)

      //Create the request context
      let context = createContext(req, res, config, logger)

      req.on('data', (d) => {
        context.client.requestData.data = Buffer.concat([
          context.client.requestData.data,
          d,
        ])
      })

      req.on('end', async () => {
        try {
          await processRequest(context, logger, plugins)
        } catch (ex) {
          if (res.writableFinished) return

          res.writeHead(500, { 'content-type': 'text/plain' })
          res.write(ex.toString())
          res.end()
          return
        }

        if (res.writableFinished) return

        let responseData = context.client.responseData
        res.writeHead(responseData.statusCode, responseData.headers)
        res.addTrailers(responseData.trailers)
        res.write(responseData.data)
        res.end()
      })
    })
  },
}
