const express = require('express')
const prisma = require('../lib/prisma')
const { seedAccounts, seedCategories } = require('../../prisma/seed')

const router = express.Router()

router.post('/reset', async (req, res) => {
  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.investmentEntry.deleteMany(),
    prisma.investment.deleteMany(),
    prisma.budget.deleteMany(),
    prisma.recurrenceRule.deleteMany(),
    prisma.creditCard.deleteMany(),
    prisma.category.deleteMany({ where: { parentId: { not: null } } }),
    prisma.category.deleteMany(),
    prisma.account.deleteMany(),
  ])

  await seedAccounts(prisma)
  await seedCategories(prisma)

  res.status(204).send()
})

module.exports = router
