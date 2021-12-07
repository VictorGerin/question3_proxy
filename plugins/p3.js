module.exports = {
  priority: 3,
  plugin: (requestData, context, logger) => {
    logger.verbose('p3 - begin')

    return () => {
      logger.verbose('p3 - after')
    }
  },
}
