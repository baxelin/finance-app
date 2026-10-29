const prisma = require('./prisma')
const { todayUtc } = require('./dates')

async function confirmDueAutoConfirmTransactions() {
  await prisma.transaction.updateMany({
    where: {
      recurrenceRule: { is: { autoConfirm: true } },
      status: 'pending',
      competenceDate: { lte: todayUtc() },
    },
    data: { status: 'confirmed' },
  })
}

module.exports = { confirmDueAutoConfirmTransactions }
