module.exports = {
  // base destination
  baseDestination: 'ptsv2.com', // required
  //basePort: 443, // notRequire default 443 https or 80 for http
  https: false,
  overideHost: true, //default true, override http header host with baseDestination prop
  // pluginsFolder: './plugins', --Default value
  sysPlugins: [
    'proxy',
    // 'blockList',
    'router',
    // 'auth'
  ],
  router: [
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
  blocklist: ['::1', '::ffff:127.0.0.1'],
  lstUsers: {
    victor: '123456',
  },
}
