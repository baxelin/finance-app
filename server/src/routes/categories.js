const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

router.get('/', async (req, res) => {
  const categories = await prisma.category.findMany({
    include: { children: true },
    orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
  })
  res.json(categories.filter((c) => c.parentId === null))
})

router.post('/', async (req, res) => {
  const { name, type, parentId, icon, color } = req.body
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' })
  if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'invalid type' })

  const category = await prisma.category.create({
    data: {
      name,
      type,
      parentId: parentId ?? null,
      isDefault: false,
      ...(icon && { icon }),
      ...(color && { color }),
    },
  })
  res.status(201).json(category)
})

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const { name, parentId, icon, color } = req.body
  const category = await prisma.category.update({
    where: { id },
    data: {
      name,
      parentId: parentId ?? null,
      ...(icon && { icon }),
      ...(color && { color }),
    },
  })
  res.json(category)
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const inUse = await prisma.transaction.count({ where: { categoryId: id } })
  if (inUse > 0) {
    return res.status(409).json({ error: 'Category is in use by existing transactions' })
  }
  await prisma.category.delete({ where: { id } })
  res.status(204).send()
})

module.exports = router
