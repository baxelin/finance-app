const express = require('express')
const prisma = require('../lib/prisma')
const { monthRange } = require('../lib/dates')

const router = express.Router()

router.get('/', async (req, res) => {
  const cards = await prisma.creditCard.findMany({
    include: { account: true },
    orderBy: { id: 'asc' },
  })
  res.json(cards)
})

router.post('/', async (req, res) => {
  const { name, accountId, closingDay, dueDay } = req.body
  if (!name || !accountId || !closingDay || !dueDay) {
    return res.status(400).json({ error: 'name, accountId, closingDay and dueDay are required' })
  }
  const card = await prisma.creditCard.create({
    data: { name, accountId: Number(accountId), closingDay: Number(closingDay), dueDay: Number(dueDay) },
  })
  res.status(201).json(card)
})

router.put('/:id', async (req, res) => {
  const { name, closingDay, dueDay } = req.body
  const card = await prisma.creditCard.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(name !== undefined && { name }),
      ...(closingDay !== undefined && { closingDay: Number(closingDay) }),
      ...(dueDay !== undefined && { dueDay: Number(dueDay) }),
    },
  })
  res.json(card)
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const purchaseCount = await prisma.transaction.count({ where: { creditCardId: id } })
  if (purchaseCount > 0) return res.status(409).json({ error: 'Card has existing transactions' })
  await prisma.creditCard.delete({ where: { id } })
  res.status(204).send()
})

function invoiceKey(competenceDate) {
  return competenceDate.toISOString().slice(0, 7)
}

function groupIntoInvoices(purchases) {
  const invoices = new Map()
  for (const purchase of purchases) {
    const key = invoiceKey(purchase.competenceDate)
    const invoice = invoices.get(key) ?? { key, competenceDate: purchase.competenceDate, total: 0, purchaseCount: 0, status: 'confirmed' }
    invoice.total += purchase.amount
    invoice.purchaseCount += 1
    if (purchase.status === 'pending') invoice.status = 'pending'
    invoices.set(key, invoice)
  }
  return [...invoices.values()]
}

function invoiceFilter(params) {
  return {
    creditCardId: Number(params.id),
    competenceDate: monthRange(Number(params.year), Number(params.month)),
  }
}

router.get('/:id/invoices', async (req, res) => {
  const purchases = await prisma.transaction.findMany({
    where: { creditCardId: Number(req.params.id) },
    orderBy: { competenceDate: 'asc' },
  })
  res.json(groupIntoInvoices(purchases))
})

router.get('/:id/invoices/:year/:month', async (req, res) => {
  const purchases = await prisma.transaction.findMany({
    where: invoiceFilter(req.params),
    include: { category: true },
    orderBy: { date: 'asc' },
  })
  res.json(purchases)
})

router.post('/:id/invoices/:year/:month/confirm', async (req, res) => {
  const result = await prisma.transaction.updateMany({
    where: invoiceFilter(req.params),
    data: { status: 'confirmed' },
  })
  res.json({ updated: result.count })
})

module.exports = router
