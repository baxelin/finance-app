const prisma = require('./prisma')
const { signedAmount, getAccountBalance } = require('./balances')
const { monthRangeOf } = require('./dates')

const VARIABLE_EXPENSE_LOOKBACK_MONTHS = 3

async function averageMonthlyVariableExpenses(accountIds, referenceDate) {
  const lookbackStart = monthRangeOf(referenceDate, -VARIABLE_EXPENSE_LOOKBACK_MONTHS).gte
  const currentMonthStart = monthRangeOf(referenceDate).gte

  const variableExpenses = await prisma.transaction.findMany({
    where: {
      accountId: { in: accountIds },
      type: 'expense',
      status: 'confirmed',
      recurrenceRuleId: null,
      creditCardId: null,
      competenceDate: { gte: lookbackStart, lt: currentMonthStart },
    },
  })

  const total = variableExpenses.reduce((sum, transaction) => sum + transaction.amount, 0)
  return total / VARIABLE_EXPENSE_LOOKBACK_MONTHS
}

function netChangeAcross(accountIds, transactions) {
  return transactions.reduce((sum, transaction) => {
    const touchedAccounts = new Set([transaction.accountId, transaction.destinationAccountId])
    const ownTouchedAccounts = [...touchedAccounts].filter((id) => accountIds.includes(id))
    return sum + ownTouchedAccounts.reduce((delta, id) => delta + signedAmount(transaction, id), 0)
  }, 0)
}

async function totalBalance(accountIds) {
  const balances = await Promise.all(accountIds.map(getAccountBalance))
  return balances.reduce((sum, balance) => sum + balance, 0)
}

async function projectMonths(accountIds, months = 3, referenceDate = new Date()) {
  let runningBalance = await totalBalance(accountIds)
  const variableExpenses = await averageMonthlyVariableExpenses(accountIds, referenceDate)

  const projection = []
  for (let offset = 1; offset <= months; offset += 1) {
    const month = monthRangeOf(referenceDate, offset)
    const scheduled = await prisma.transaction.findMany({
      where: {
        OR: [{ accountId: { in: accountIds } }, { destinationAccountId: { in: accountIds } }],
        status: 'pending',
        competenceDate: month,
      },
    })

    runningBalance += netChangeAcross(accountIds, scheduled) - variableExpenses
    projection.push({
      year: month.gte.getUTCFullYear(),
      month: month.gte.getUTCMonth() + 1,
      projectedBalance: runningBalance,
    })
  }

  return projection
}

module.exports = { projectMonths }
