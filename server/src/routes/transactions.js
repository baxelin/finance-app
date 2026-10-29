const express = require('express')
const prisma = require('../lib/prisma')
const { computeCompetenceDate } = require('../lib/invoiceCycle')
const { buildInstallmentPlan } = require('../lib/installments')
const { generateOccurrences } = require('../lib/recurrence')
const { monthRange, parseDate, todayUtc } = require('../lib/dates')

const router = express.Router()

const RECURRENCE_GENERATION_HORIZON_MONTHS = 12
const INTERNAL_TRANSFER_DESCRIPTION = 'Transferência entre contas'

function optionalId(value) {
  return value ? Number(value) : null
}

function statusForDate(requestedStatus, date) {
  if (requestedStatus === 'pending' || requestedStatus === 'confirmed') return requestedStatus
  return date > todayUtc() ? 'pending' : 'confirmed'
}

function competenceFilter({ month, from, to }) {
  if (month) {
    const [year, monthNumber] = month.split('-').map(Number)
    return monthRange(year, monthNumber)
  }
  if (from || to) {
    return {
      ...(from && { gte: parseDate(from) }),
      ...(to && { lte: parseDate(to) }),
    }
  }
  return undefined
}

router.get('/', async (req, res) => {
  const { accountId, status, type, categoryId } = req.query

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(accountId && { OR: [{ accountId: Number(accountId) }, { destinationAccountId: Number(accountId) }] }),
      ...(status && { status }),
      ...(type && { type }),
      ...(categoryId && { categoryId: Number(categoryId) }),
      competenceDate: competenceFilter(req.query),
    },
    include: { category: true, account: true, destinationAccount: true, creditCard: true },
    orderBy: { competenceDate: 'desc' },
  })
  res.json(transactions)
})

async function createThirdPartyTransfer(body) {
  const transferCategory = await prisma.category.findFirst({ where: { name: 'Transferência', type: 'expense' } })
  const date = parseDate(body.date)
  return prisma.transaction.create({
    data: {
      type: 'expense',
      description: body.description,
      amount: body.amount,
      date,
      competenceDate: date,
      accountId: Number(body.accountId),
      categoryId: transferCategory?.id ?? null,
      status: statusForDate(body.status, date),
    },
  })
}

function createInternalTransfer(body) {
  const date = parseDate(body.date)
  return prisma.transaction.create({
    data: {
      type: 'transfer',
      description: body.description || INTERNAL_TRANSFER_DESCRIPTION,
      amount: body.amount,
      date,
      competenceDate: date,
      accountId: Number(body.accountId),
      destinationAccountId: Number(body.destinationAccountId),
      status: 'confirmed',
    },
  })
}

function createInstallmentPurchase(body, card, purchaseDate) {
  const plan = buildInstallmentPlan({
    purchaseDate,
    closingDay: card.closingDay,
    dueDay: card.dueDay,
    ...body.installment,
  })

  return prisma.$transaction(
    plan.map((installment) =>
      prisma.transaction.create({
        data: {
          ...installment,
          type: 'expense',
          description: body.description,
          categoryId: optionalId(body.categoryId),
          accountId: card.accountId,
          creditCardId: card.id,
          status: 'pending',
        },
      })
    )
  )
}

function createSingleCardPurchase(body, card, purchaseDate) {
  return prisma.transaction.create({
    data: {
      type: 'expense',
      description: body.description,
      amount: body.amount,
      date: purchaseDate,
      competenceDate: computeCompetenceDate(purchaseDate, card.closingDay, card.dueDay),
      categoryId: optionalId(body.categoryId),
      accountId: card.accountId,
      creditCardId: card.id,
      status: 'pending',
    },
  })
}

async function createCardPurchase(body) {
  const card = await prisma.creditCard.findUnique({ where: { id: Number(body.creditCardId) } })
  if (!card) return null

  const purchaseDate = parseDate(body.date)
  return body.installment
    ? createInstallmentPurchase(body, card, purchaseDate)
    : createSingleCardPurchase(body, card, purchaseDate)
}

function occurrenceStatus(rule, occurrenceDate) {
  const hasArrived = occurrenceDate <= todayUtc()
  return rule.autoConfirm && hasArrived ? 'confirmed' : 'pending'
}

async function createRecurringTransactions(body) {
  const startDate = parseDate(body.date)
  const rule = await prisma.recurrenceRule.create({
    data: {
      frequency: body.recurrence.frequency,
      startDate,
      endDate: body.recurrence.endDate ? parseDate(body.recurrence.endDate) : null,
      autoConfirm: Boolean(body.recurrence.autoConfirm),
      description: body.description,
      amount: body.amount,
      type: body.type,
      categoryId: optionalId(body.categoryId),
      accountId: Number(body.accountId),
    },
  })

  const horizon = new Date(startDate)
  horizon.setUTCMonth(horizon.getUTCMonth() + RECURRENCE_GENERATION_HORIZON_MONTHS)

  const transactions = await prisma.$transaction(
    generateOccurrences(rule, startDate, horizon).map((date) =>
      prisma.transaction.create({
        data: {
          type: rule.type,
          description: rule.description,
          amount: rule.amount,
          date,
          competenceDate: date,
          categoryId: rule.categoryId,
          accountId: rule.accountId,
          status: occurrenceStatus(rule, date),
          recurrenceRuleId: rule.id,
        },
      })
    )
  )
  return { rule, transactions }
}

function createSingleTransaction(body) {
  const date = parseDate(body.date)
  return prisma.transaction.create({
    data: {
      type: body.type,
      description: body.description,
      amount: body.amount,
      date,
      competenceDate: date,
      categoryId: optionalId(body.categoryId),
      accountId: Number(body.accountId),
      status: statusForDate(body.status, date),
    },
  })
}

router.post('/', async (req, res) => {
  const body = req.body
  try {
    if (body.type === 'transfer') {
      const transfer = body.destinationAccountId ? await createInternalTransfer(body) : await createThirdPartyTransfer(body)
      return res.status(201).json(transfer)
    }

    if (body.type === 'expense' && body.creditCardId) {
      const purchase = await createCardPurchase(body)
      if (!purchase) return res.status(404).json({ error: 'Credit card not found' })
      return res.status(201).json(purchase)
    }

    const created = body.recurrence ? await createRecurringTransactions(body) : await createSingleTransaction(body)
    res.status(201).json(created)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/:id/confirm', async (req, res) => {
  const transaction = await prisma.transaction.update({
    where: { id: Number(req.params.id) },
    data: { status: 'confirmed' },
  })
  res.json(transaction)
})

function siblingsInScope(transaction, scope) {
  if (scope === 'group' && transaction.installmentGroupId) {
    return { installmentGroupId: transaction.installmentGroupId }
  }
  if (scope === 'future' && transaction.recurrenceRuleId) {
    return { recurrenceRuleId: transaction.recurrenceRuleId, competenceDate: { gte: transaction.competenceDate } }
  }
  return null
}

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const { description, categoryId, amount, date, status } = req.body

  const existing = await prisma.transaction.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Transaction not found' })

  const sharedChanges = {
    ...(description !== undefined && { description }),
    ...(categoryId !== undefined && { categoryId: optionalId(categoryId) }),
    ...(status !== undefined && { status }),
  }

  const siblings = siblingsInScope(existing, req.query.scope)
  if (siblings) {
    const onlyPendingRecurrences = siblings.recurrenceRuleId ? { status: 'pending' } : {}
    const result = await prisma.transaction.updateMany({ where: { ...siblings, ...onlyPendingRecurrences }, data: sharedChanges })
    return res.json({ updated: result.count })
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      ...sharedChanges,
      ...(amount !== undefined && { amount }),
      ...(date !== undefined && { date: parseDate(date), competenceDate: parseDate(date) }),
    },
  })
  res.json(transaction)
})

async function endRecurrenceBefore(ruleId, date) {
  const dayBefore = new Date(date)
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1)
  await prisma.recurrenceRule.update({ where: { id: ruleId }, data: { endDate: dayBefore } })
}

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await prisma.transaction.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Transaction not found' })

  const siblings = siblingsInScope(existing, req.query.scope)
  if (!siblings) {
    await prisma.transaction.delete({ where: { id } })
    return res.status(204).send()
  }

  await prisma.transaction.deleteMany({ where: siblings })
  if (siblings.recurrenceRuleId) await endRecurrenceBefore(existing.recurrenceRuleId, existing.competenceDate)
  res.status(204).send()
})

module.exports = router
