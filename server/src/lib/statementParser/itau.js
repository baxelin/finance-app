const TRANSACTION_LINE = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})$/
const DAILY_BALANCE_DESCRIPTION = /^saldo do dia$/i

function parseBrAmount(value) {
  return Number(value.replace(/\./g, '').replace(',', '.'))
}

function parseBrDate(value) {
  const [day, month, year] = value.split('/').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function parseLine(line) {
  const match = line.trim().match(TRANSACTION_LINE)
  if (!match) return null

  const [, date, rawDescription, signedValue] = match
  const description = rawDescription.trim()
  const value = parseBrAmount(signedValue)
  if (DAILY_BALANCE_DESCRIPTION.test(description) || !value) return null

  return {
    rawDescription: description,
    date: parseBrDate(date),
    amount: Math.abs(value),
    type: value < 0 ? 'expense' : 'income',
  }
}

function parseItauStatement(text) {
  return text.split(/\r?\n/).map(parseLine).filter(Boolean)
}

module.exports = { parseItauStatement }
