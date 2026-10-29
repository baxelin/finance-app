const express = require('express')
const prisma = require('../lib/prisma')
const { getAccountBalance, getProjectedMonthBalance } = require('../lib/balances')

const router = express.Router()

router.get('/', async (req, res) => {
  const accounts = await prisma.account.findMany({ orderBy: { id: 'asc' } })
  const withBalances = await Promise.all(
    accounts.map(async (account) => ({
      ...account,
      balance: await getAccountBalance(account.id),
      projectedMonthBalance: await getProjectedMonthBalance(account.id),
    }))
  )
  res.json(withBalances)
})

router.get('/:id', async (req, res) => {
  const account = await prisma.account.findUnique({ where: { id: Number(req.params.id) } })
  if (!account) return res.status(404).json({ error: 'Account not found' })
  res.json({
    ...account,
    balance: await getAccountBalance(account.id),
    projectedMonthBalance: await getProjectedMonthBalance(account.id),
  })
})

module.exports = router
