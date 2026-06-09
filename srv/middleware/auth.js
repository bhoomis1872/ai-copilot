module.exports = (req, res, next) => {
  console.log('Auth middleware loaded')
  next()
}