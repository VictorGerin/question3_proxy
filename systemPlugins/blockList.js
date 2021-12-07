const fs = require('fs').promises

module.exports = {
  priority: -1000000,

  plugin: async (req, context, logger) => {
    let blockConfig = context.config.blocklist

    //Do nothing if do not have config
    if (!blockConfig) return

    let remoteAddr = context.client.req.socket.remoteAddress

    //look if remote address is in the config list
    if (blockConfig.indexOf(remoteAddr) !== -1) {
      const data = await fs.readFile('./public/forbidden.html', 'utf8')
      let res = context.client.res
      res.writeHead(403, { 'content-type': 'text/html' })
      res.write(data)
      res.end()
      throw `Blocked - ${remoteAddr}`
    }
  },
}
