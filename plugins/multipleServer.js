/**
 * This is a exemple of async module
 *
 * This module looks at the url to change the redirect url
 *
 */

exports.priority = 0

exports.plugin = async (req, context) => {
  /**
   * module configs can be stored inside of file config
   */
  let config = context.config.multipleServe

  if (!config) {
    return () => {}
  }

  //search fo a match
  let newRedirect = config.filter((a) => req.path.startsWith(a.url))

  if (newRedirect.length) {
    //if matched change the proxy request data
    let request = context.proxyed.requestData

    //Fix the path removing the begin founded
    request.path = request.path.replace(newRedirect[0].url, '')

    //change the redirect andress
    request.hostname = newRedirect[0].destination
    request.headers['host'] = newRedirect[0].destination

    //look for specifics config
    if (newRedirect[0].https !== undefined)
      context.proxyed.https = newRedirect[0].https

    request.port = newRedirect[0].port
      ? newRedirect[0].port
      : context.proxyed.https
      ? 443
      : 80
  }

  return () => {}
}
