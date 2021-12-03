let start

//high priority ensure this module be the first on before and last on after
exports.priority = Infinity

exports.before = (next, fail) => {
  start = process.hrtime()
  next()
}

exports.after = (next) => {
  let time = process.hrtime(start)
  let elapsed = time[0] * 1000 + time[1] / 1000000

  console.log(`time passed - ${elapsed} ms`)
  next()
}
