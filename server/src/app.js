const path = require('node:path')
const fs = require('node:fs')
const express = require('express')
const cors = require('cors')

const accountsRouter = require('./routes/accounts')
const categoriesRouter = require('./routes/categories')
const transactionsRouter = require('./routes/transactions')
const cardsRouter = require('./routes/cards')
const investmentsRouter = require('./routes/investments')
const budgetsRouter = require('./routes/budgets')
const dashboardRouter = require('./routes/dashboard')
const recurringRouter = require('./routes/recurring')
const settingsRouter = require('./routes/settings')
const importsRouter = require('./routes/imports')
const { confirmDueAutoConfirmTransactions } = require('./lib/autoConfirm')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', async (req, res, next) => {
  try {
    await confirmDueAutoConfirmTransactions()
  } catch (err) {
    console.error('confirmDueAutoConfirmTransactions failed', err)
  }
  next()
})

app.use('/api/accounts', accountsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/investments', investmentsRouter)
app.use('/api/budgets', budgetsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/recurring', recurringRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/imports', importsRouter)

const builtClientDir = path.join(__dirname, '..', 'public')
const builtClientIndex = path.join(builtClientDir, 'index.html')
if (fs.existsSync(builtClientIndex)) {
  app.use(express.static(builtClientDir))
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(builtClientIndex)
  })
}

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

module.exports = app
