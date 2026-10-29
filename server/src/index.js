require('dotenv/config')
const app = require('./app')

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`FinApp server listening on http://localhost:${PORT}`)
})
