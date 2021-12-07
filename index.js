const { createServer } = require('./proxy')

const { program } = require('commander')
program.version('0.0.1')

program
  .option('-p, --port <val>', 'listen server port', 8080)
  .option('-l, --logLevel <val>', 'Level of the logger', 'info')
  .option('-c, --config <val>', 'Configuration file', './config')
  .option('-P, --plugins <val>', 'Alternative user plugins folder', './plugins')

program.parse(process.argv)

const options = program.opts()

const main = () => {
  const config = require(options.config)
  const logger = require('./logger')

  logger.level = options.logLevel

  createServer({
    config,
    plugins: options.plugins,
    logger,
  }).listen(options.port)
}

if (require.main === module) {
  main()
}

// ./idnex.js --config=./config.js --plguins=./folderPlug --port=X --logLevel=Y
