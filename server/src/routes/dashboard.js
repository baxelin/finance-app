const express = require('express')
const prisma = require('../lib/prisma')
const { getAccountBalance, getProjectedMonthBalance } = require('../lib/balances')
const { projectMonths } = require('../lib/forecast')
const { monthRange } = require('../lib/dates')

const router = express.Router()

const FORECAST_MONTHS = 3
const UNCATEGORIZED_LABEL = 'Sem categoria'

function monthTransactions(accountIds, year, month, type) {
  return prisma.transaction.findMany({
    where: { accountId: { in: accountIds }, type, competenceDate: monthRange(year, month) },
    include: { category: true, account: true },
  })
}

function sumAmounts(transactions) {
  return transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
}

function sumAmountsBy(transactions, keyOf) {
  const totals = {}
  for (const transaction of transactions) {
    const key = keyOf(transaction)
    if (key == null) continue
    totals[key] = (totals[key] || 0) + transaction.amount
  }
  return totals
}

function cumulativeDailySpend(expenses, year, month) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const spentPerDay = new Array(daysInMonth).fill(0)
  for (const expense of expenses) {
    if (expense.status !== 'confirmed') continue
    spentPerDay[new Date(expense.competenceDate).getUTCDate() - 1] += expense.amount
  }

  let runningTotal = 0
  return spentPerDay.map((amount) => (runningTotal += amount))
}

function previousMonthOf(year, month) {
  const date = new Date(Date.UTC(year, month - 2, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}

async function budgetProgress(spentByCategoryId) {
  const budgets = await prisma.budget.findMany({ include: { category: { include: { children: true } } } })

  return budgets.map(({ category, categoryId, monthlyLimit }) => {
    const budgetedCategoryIds = [categoryId, ...category.children.map((child) => child.id)]
    const spent = budgetedCategoryIds.reduce((sum, id) => sum + (spentByCategoryId[id] || 0), 0)
    return {
      category: category.name,
      monthlyLimit,
      spent,
      percentage: monthlyLimit > 0 ? Math.round((spent / monthlyLimit) * 100) : 0,
    }
  })
}

function requestedMonth(query) {
  const now = new Date()
  return {
    year: query.year ? Number(query.year) : now.getUTCFullYear(),
    month: query.month ? Number(query.month) : now.getUTCMonth() + 1,
  }
}

router.get('/summary', async (req, res) => {
  const { year, month } = requestedMonth(req.query)
  const previous = previousMonthOf(year, month)
  const referenceDate = new Date(Date.UTC(year, month - 1, 1))

  const accounts = await prisma.account.findMany({ orderBy: { id: 'asc' } })
  const accountIds = accounts.map((account) => account.id)

  const accountSummaries = await Promise.all(
    accounts.map(async ({ id, name, type }) => ({
      id,
      name,
      type,
      balance: await getAccountBalance(id),
      projectedMonthBalance: await getProjectedMonthBalance(id, referenceDate),
    }))
  )

  const [expenses, income, previousExpenses, forecast] = await Promise.all([
    monthTransactions(accountIds, year, month, 'expense'),
    monthTransactions(accountIds, year, month, 'income'),
    monthTransactions(accountIds, previous.year, previous.month, 'expense'),
    projectMonths(accountIds, FORECAST_MONTHS, referenceDate),
  ])

  const totalExpenseThisMonth = sumAmounts(expenses)
  const totalExpensePrevMonth = sumAmounts(previousExpenses)

  res.json({
    accounts: accountSummaries,
    totalBalance: accountSummaries.reduce((sum, account) => sum + account.balance, 0),
    totalProjectedMonthBalance: accountSummaries.reduce((sum, account) => sum + account.projectedMonthBalance, 0),
    totalExpenseThisMonth,
    totalExpensePrevMonth,
    totalIncomeThisMonth: sumAmounts(income),
    expenseDeltaVsPrevMonth: totalExpenseThisMonth - totalExpensePrevMonth,
    expensesByAccount: sumAmountsBy(expenses, (expense) => expense.account.name),
    expensesByCategory: sumAmountsBy(expenses, (expense) => expense.category?.name || UNCATEGORIZED_LABEL),
    spendRhythm: {
      current: cumulativeDailySpend(expenses, year, month),
      previous: cumulativeDailySpend(previousExpenses, previous.year, previous.month),
    },
    forecast,
    budgetProgress: await budgetProgress(sumAmountsBy(expenses, (expense) => expense.categoryId)),
  })
})

module.exports = router
