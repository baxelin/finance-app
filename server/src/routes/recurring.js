const express = require('express')
const prisma = require('../lib/prisma')
const { todayUtc } = require('../lib/dates')

const router = express.Router()

const OCCURRENCES_PER_MONTH = {
  daily: 30,
  every_4_days: 7.5,
  weekly: 4.345,
  biweekly: 2.1725,
  monthly: 1,
  quarterly: 1 / 3,
  semiannual: 1 / 6,
  annual: 1 / 12,
}

router.get('/rules', async (req, res) => {
  const today = todayUtc()

  const rules = await prisma.recurrenceRule.findMany({
    include: { category: true, account: true },
    orderBy: { id: 'desc' },
  })

  const enriched = await Promise.all(
    rules.map(async (rule) => {
      const isActive = !rule.endDate || rule.endDate >= today
      const nextTransaction = await prisma.transaction.findFirst({
        where: { recurrenceRuleId: rule.id, competenceDate: { gte: today } },
        orderBy: { competenceDate: 'asc' },
      })
      const monthlyAmount = rule.amount * (OCCURRENCES_PER_MONTH[rule.frequency] ?? 1)
      return {
        ...rule,
        isActive,
        nextOccurrence: nextTransaction?.competenceDate ?? null,
        nextStatus: nextTransaction?.status ?? null,
        monthlyAmount,
      }
    })
  )

  res.json(enriched)
})

router.get('/installments', async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    where: { installmentGroupId: { not: null } },
    include: { category: true, account: true, creditCard: true },
    orderBy: { competenceDate: 'asc' },
  })

  const groups = new Map()
  for (const t of transactions) {
    if (!groups.has(t.installmentGroupId)) {
      groups.set(t.installmentGroupId, {
        installmentGroupId: t.installmentGroupId,
        description: t.description,
        category: t.category,
        account: t.account,
        creditCard: t.creditCard,
        installmentTotal: t.installmentTotal,
        totalAmount: 0,
        paidCount: 0,
        nextDueDate: null,
        nextStatus: null,
      })
    }
    const group = groups.get(t.installmentGroupId)
    group.totalAmount += t.amount
    if (t.status === 'confirmed') group.paidCount += 1
    if (t.status === 'pending' && (!group.nextDueDate || t.competenceDate < group.nextDueDate)) {
      group.nextDueDate = t.competenceDate
      group.nextStatus = t.status
    }
  }

  res.json(Array.from(groups.values()))
})

module.exports = router
