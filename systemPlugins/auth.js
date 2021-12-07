module.exports = {
  priority: -100000,

  plugin: (request, context, logger) => {
    let config = context.config.lstUsers

    //without config, do nothing
    if (!config) return

    const failAuth = () => {
      let res = context.client.res
      res.writeHead(401, {
        'content-type': 'text/html',
        'WWW-Authenticate': 'Basic realm="login", charset="UTF-8"',
      })
      res.end()
      throw `Fail to auth`
    }

    if (!request.headers['authorization']) failAuth()

    let auth = Buffer.from(
      request.headers['authorization'].replace('Basic ', ''),
      'base64',
    )
      .toString('ascii')
      .split(':')

    if (!config[auth[0]] || config[auth[0]] != auth[1]) failAuth()
  },
}
