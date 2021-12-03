module.exports = {
  // base destination
  baseDestination: 'ptsv2.com', // required
  //basePort: 443, // notRequire default 443 https or 80 for http
  https: false,
  overideHost: true, //default true, override http header host with baseDestination prop
  // pluginsFolder: './plugins', --Default value
  multipleServe: [
    {
      url: '/page1',
      destination: 'ptsv2.com',
      https: true,
    },
    {
      url: '/page2',
      destination: 'www.stackoverflow.com',
    },
  ],
}
