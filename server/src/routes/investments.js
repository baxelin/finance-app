const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

router.get('/', async (req, res) => {
  const investments = await prisma.investment.findMany({
    include: { account: true },
    orderBy: { id: 'asc' },
  })
  res.json(investments)
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const investment = await prisma.investment.findUnique({
    where: { id },
    include: { account: true, entries: { orderBy: { date: 'asc' } } },
  })
  if (!investment) return res.status(404).json({ error: 'Investment not found' })
  res.json(investment)
})

router.post('/', async (req, res) => {
  const { name, accountId, currentValue } = req.body
  if (!name || !accountId || currentValue === undefined) {
    return res.status(400).json({ error: 'name, accountId and currentValue are required' })
  }
  const investment = await prisma.investment.create({
    data: { name, accountId: Number(accountId), currentValue },
  })
  await prisma.investmentEntry.create({
    data: { investmentId: investment.id, value: currentValue },
  })
  res.status(201).json(investment)
})

router.post('/:id/entries', async (req, res) => {
  const id = Number(req.params.id)
  const { value, date } = req.body
  if (value === undefined) return res.status(400).json({ error: 'value is required' })

  const [investment, entry] = await prisma.$transaction([
    prisma.investment.update({ where: { id }, data: { currentValue: value } }),
    prisma.investmentEntry.create({
      data: { investmentId: id, value, ...(date && { date: new Date(date) }) },
    }),
  ])

  res.status(201).json({ investment, entry })
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  await prisma.investmentEntry.deleteMany({ where: { investmentId: id } })
  await prisma.investment.delete({ where: { id } })
  res.status(204).send()
})

module.exports = router
