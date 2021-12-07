module.exports = {
  priority: 1,
  plugin: (requestData, context, logger) => {
    logger.verbose('p1 - begin')

    return () => {
      // throw 'Err'
      logger.verbose('p1 - after')
    }
  },
}
