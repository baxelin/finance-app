const prisma = require('./prisma')
const { monthRangeOf } = require('./dates')

function signedAmount(transaction, accountId) {
  if (transaction.type === 'income') return transaction.amount
  if (transaction.type === 'expense') return -transaction.amount
  if (transaction.type === 'transfer') {
    const isIncoming = transaction.destinationAccountId === accountId
    return isIncoming ? transaction.amount : -transaction.amount
  }
  return 0
}

function netAmount(transactions, accountId) {
  return transactions.reduce((sum, transaction) => sum + signedAmount(transaction, accountId), 0)
}

function transactionsAffecting(accountId, filters = {}) {
  return prisma.transaction.findMany({
    where: {
      OR: [{ accountId }, { destinationAccountId: accountId }],
      ...filters,
    },
  })
}

async function getAccountBalance(accountId) {
  const confirmed = await transactionsAffecting(accountId, { status: 'confirmed' })
  return netAmount(confirmed, accountId)
}

async function getProjectedMonthBalance(accountId, referenceDate = new Date()) {
  const currentBalance = await getAccountBalance(accountId)
  const pendingThisMonth = await transactionsAffecting(accountId, {
    status: 'pending',
    competenceDate: monthRangeOf(referenceDate),
  })
  return currentBalance + netAmount(pendingThisMonth, accountId)
}

module.exports = { signedAmount, getAccountBalance, getProjectedMonthBalance }
