const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

router.get('/', async (req, res) => {
  const budgets = await prisma.budget.findMany({ include: { category: true } })
  res.json(budgets)
})

router.post('/', async (req, res) => {
  const { categoryId, monthlyLimit } = req.body
  if (!categoryId || monthlyLimit === undefined) {
    return res.status(400).json({ error: 'categoryId and monthlyLimit are required' })
  }
  const budget = await prisma.budget.upsert({
    where: { categoryId: Number(categoryId) },
    update: { monthlyLimit },
    create: { categoryId: Number(categoryId), monthlyLimit },
  })
  res.status(201).json(budget)
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  await prisma.budget.delete({ where: { id } })
  res.status(204).send()
})

module.exports = router
