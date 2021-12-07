const http = require('http')
const https = require('https')

function makeProxyCall(context) {
  return new Promise((resolve, reject) => {
    let responseData = {
      headers: [],
      method: '',
      url: '',
      trailers: [],
      data: Buffer.alloc(0),
    }

    let httpModule = context.proxyed.https ? https : http

    const newReq = httpModule.request(context.proxyed.requestData, (res) => {
      res.on('data', (d) => {
        responseData.data = Buffer.concat([responseData.data, d])
      })

      res.on('end', () => {
        resolve({
          headers: res.headers,
          method: res.method,
          url: res.url,
          trailers: res.trailers,
          data: responseData.data,
          statusCode: res.statusCode,
        })
      })
    })

    newReq.on('error', (error) => {
      reject(error)
    })

    newReq.addTrailers(context.client.requestData.trailers)
    newReq.write(context.client.requestData.data)
    newReq.end()
  })
}

module.exports = {
  priority: -Infinity,
  plugin: async (requestData, context, logger) => {
    logger.debug('proxy request data', requestData)

    context.proxyed.responseData = await makeProxyCall(context)
    context.client.responseData = JSON.parse(
      JSON.stringify(context.proxyed.responseData),
    )

    delete context.client.responseData.data
    logger.debug('proxy ersponse data', context.client.responseData)
    context.client.responseData.data = context.proxyed.responseData.data
  },
}
