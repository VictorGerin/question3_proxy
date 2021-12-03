const {createServer} = require("./proxy");
const config = require('./config')


const main = () => {
    createServer(config).listen(8080, () => {
        console.log('Server starded')
    })
}



if (require.main === module) {
    main();
}
