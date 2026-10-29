function startOfMonthUtc(year, month) {
  return new Date(Date.UTC(year, month - 1, 1))
}

function monthRange(year, month) {
  return { gte: startOfMonthUtc(year, month), lt: startOfMonthUtc(year, month + 1) }
}

function monthRangeOf(date, offsetMonths = 0) {
  return monthRange(date.getUTCFullYear(), date.getUTCMonth() + 1 + offsetMonths)
}

function todayUtc() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

function toIsoDate(date) {
  return new Date(date).toISOString().slice(0, 10)
}

function parseDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`)
  return date
}

module.exports = { startOfMonthUtc, monthRange, monthRangeOf, todayUtc, toIsoDate, parseDate }
