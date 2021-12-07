module.exports = {
  priority: 2,
  plugin: (requestData, context, logger) => {
    logger.verbose('p2 - begin')

    return () => {
      logger.verbose('p2 - after')
    }
  },
}
