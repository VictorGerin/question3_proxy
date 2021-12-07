module.exports = {
  priority: 2,
  plugin: (requestData, context, logger) => {
    logger.verbose('p2.2 - begin')

    let res = context.client.res

    // res.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8'})
    // res.write('Ola mundo :)')
    // res.end()
    // throw 'errr'

    return () => {
      logger.verbose('p2.2 - after')
    }
  },
}
