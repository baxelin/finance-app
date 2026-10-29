function clampedUtcDate(year, month, day) {
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return new Date(Date.UTC(year, month - 1, Math.min(day, lastDayOfMonth)))
}

function addMonthsClampToDay(date, months, day) {
  return clampedUtcDate(date.getUTCFullYear(), date.getUTCMonth() + 1 + months, day)
}

function computeCompetenceDate(purchaseDate, closingDay, dueDay) {
  const closesThisMonth = purchaseDate.getUTCDate() <= closingDay
  const monthsUntilClosing = closesThisMonth ? 0 : 1
  const monthsFromClosingToDue = 1
  return addMonthsClampToDay(purchaseDate, monthsUntilClosing + monthsFromClosingToDue, dueDay)
}

module.exports = { computeCompetenceDate, addMonthsClampToDay }
