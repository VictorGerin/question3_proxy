module.exports = {
    // base destination
    baseDestination: 'stackoverflow.com', // required
    //basePort: 443, // notRequire default 443 https or 80 for http
    https: true,
    overideHost: true, //default true, override http header host with baseDestination prop
    // pluginsFolder: './plugins', --Default value
    multpleServe: [
      {
        url:'/page1',
        destination: 'ptsv2.com',
        https: true
      },
      {
        url:'/page2',
        destination: 'stackoverflow.com'
      }
    ]
};
