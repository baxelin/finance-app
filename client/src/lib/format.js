const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const calendarDayFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
const calendarMonthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value ?? 0))
}

export function formatDate(value) {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  return calendarDayFormatter.format(date)
}

export function formatMonthLabel(year, month) {
  const date = new Date(Date.UTC(year, month - 1, 1))
  const label = calendarMonthFormatter.format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}
