function pad(value) {
  return String(value).padStart(2, '0')
}

function toUtcIso(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

function parseIso(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

export function todayIso() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function addDaysIso(iso, delta) {
  const { year, month, day } = parseIso(iso)
  return toUtcIso(new Date(Date.UTC(year, month - 1, day + delta)))
}

export function weekRangeIso(iso) {
  const { year, month, day } = parseIso(iso)
  const daysSinceSunday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return {
    from: toUtcIso(new Date(Date.UTC(year, month - 1, day - daysSinceSunday))),
    to: toUtcIso(new Date(Date.UTC(year, month - 1, day - daysSinceSunday + 6))),
  }
}

export function shiftMonth({ year, month }, delta) {
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 }
}

export function yearMonthOf(isoDateTime) {
  const date = new Date(isoDateTime)
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}
