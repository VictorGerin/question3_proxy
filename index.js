const proxy = require("./proxy");
const config = require('./config')

const main = () => {
    proxy(config).listen(8080, () => {
        console.log('Server starded')
    })
}



if (require.main === module) {
    main();
}
