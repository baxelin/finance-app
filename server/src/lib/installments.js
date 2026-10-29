const { randomUUID } = require('node:crypto')
const { computeCompetenceDate, addMonthsClampToDay } = require('./invoiceCycle')

function roundCents(value) {
  return Math.round(value * 100) / 100
}

function monthsBetween(start, end) {
  return (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth())
}

function splitTotalIntoInstallments(totalAmount, count) {
  const baseAmount = roundCents(totalAmount / count)
  const amounts = new Array(count).fill(baseAmount)
  const roundingRemainder = roundCents(totalAmount - baseAmount * count)
  amounts[count - 1] = roundCents(baseAmount + roundingRemainder)
  return amounts
}

function repeatInstallmentUntil(perInstallmentAmount, firstCompetence, endMonth) {
  const lastCompetence = new Date(Date.UTC(endMonth.year, endMonth.month - 1, 1))
  const count = monthsBetween(firstCompetence, lastCompetence) + 1
  if (count < 1) throw new Error('endMonth must be on or after the first invoice month')
  return new Array(count).fill(perInstallmentAmount)
}

function installmentAmounts({ mode, totalAmount, installments, perInstallmentAmount, endMonth }, firstCompetence) {
  if (mode === 'total') return splitTotalIntoInstallments(totalAmount, installments)
  if (mode === 'perInstallment') return repeatInstallmentUntil(perInstallmentAmount, firstCompetence, endMonth)
  throw new Error(`Unknown installment mode: ${mode}`)
}

function buildInstallmentPlan({ purchaseDate, closingDay, dueDay, ...amountOptions }) {
  const firstCompetence = computeCompetenceDate(purchaseDate, closingDay, dueDay)
  const amounts = installmentAmounts(amountOptions, firstCompetence)
  const installmentGroupId = randomUUID()

  return amounts.map((amount, index) => {
    const date = addMonthsClampToDay(purchaseDate, index, purchaseDate.getUTCDate())
    return {
      amount,
      date,
      competenceDate: computeCompetenceDate(date, closingDay, dueDay),
      installmentGroupId,
      installmentNumber: index + 1,
      installmentTotal: amounts.length,
    }
  })
}

module.exports = { buildInstallmentPlan }
