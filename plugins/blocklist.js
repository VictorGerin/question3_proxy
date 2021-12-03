/**
 * Example of block list module
 *
 * This module is a synchronous module this means it will be executed in order
 * depending on priority value high priority means this module will be
 * executed first on before and last on after
 */

// const blockConfig = require('../bloklistConfig')

exports.priority = 10000

/**
 *
 * before function is executed before the proxy call so this is a good time to
 * verify is the remote ip andress is block by the config list
 *
 * @param {*} next - Notify a sucess execution
 * @param {*} fail - Notify a fail execution
 * @param {*} req - Current client.reuqestData
 * @param {*} context - Context of this execution
 */
exports.before = (next, fail, req, context) => {
  blockConfig = context.config.blocklist

  if (!blockConfig) {
    next()
    return
  }

  let remoteAddr = context.client.req.socket.remoteAddress

  if (blockConfig.indexOf(remoteAddr) !== -1) {
    //if blocked set as fail comunication, and give a reason
    //this reason can be process bby orther module for logging
    fail(`remoteAddr ${remoteAddr} blocked`)

    //Context can be injected with new data for comunication between modules or
    //internal comunication
    context.set403 = true

    return
  }

  //if good just ok
  next()
}

/**
 *
 * Example of sync module function
 * Since this function is executed after of proxy call or a fail on begin
 * this is a good time to change the return in this case just changing
 * the statusCode to 403 (fobiiden) if was blocked be the before
 *
 * @param {*} next - Notify a sucess execution
 * @param {*} fail - Notify a fail execution
 * @param {*} req - Current client.reuqestData
 * @param {*} responseData - Current cliente.responseData
 * @param {*} context - Context of this execution
 */
exports.after = (next, fail, requestData, responseData, context) => {
  if (context.set403) responseData.statusCode = 403

  /**
   * even on 403 fobiden this function should not fail, a fail here whuld mean server internal erro
   * so this function walways return a sucess execution
   */
  next()
}
