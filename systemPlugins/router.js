module.exports = {
  priority: -1000000,
  plugin: (req, context, logger) => {
    /**
     * module configs can be stored inside of file config
     */
    let config = context.config.router

    //if has no configuation do nothing
    if (!config) return

    //search fo a match
    let newRedirect = config.filter((a) => req.path.startsWith(a.url))

    //if don't match do nothing
    if (!newRedirect.length) return

    newRedirect = newRedirect[0]

    //Fix the path removing the begin founded
    req.path = req.path.replace(newRedirect.url, '')

    //change the redirect andress
    req.hostname = newRedirect.destination
    req.headers['host'] = newRedirect.destination

    //look for specifics config
    if (newRedirect.https !== undefined)
      context.proxyed.https = newRedirect.https

    req.port = newRedirect.port
      ? newRedirect.port
      : context.proxyed.https
      ? 443
      : 80
  },
}
