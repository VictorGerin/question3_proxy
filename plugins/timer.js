module.exports = {
  priority: Infinity,

  plugin: (request, context, logger) => {
    let start = process.hrtime()

    return () => {
      let time = process.hrtime(start)
      let elapsed = time[0] * 1000 + time[1] / 1000000

      logger.info(`time passed - ${elapsed} ms`)
    }
  },
}
