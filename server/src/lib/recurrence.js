const FREQUENCY_STEPS = {
  daily: { unit: 'day', amount: 1 },
  every_4_days: { unit: 'day', amount: 4 },
  weekly: { unit: 'day', amount: 7 },
  biweekly: { unit: 'day', amount: 14 },
  monthly: { unit: 'month', amount: 1 },
  quarterly: { unit: 'month', amount: 3 },
  semiannual: { unit: 'month', amount: 6 },
  annual: { unit: 'month', amount: 12 },
}

function nextOccurrence(date, frequency) {
  const step = FREQUENCY_STEPS[frequency]
  if (!step) throw new Error(`Unknown recurrence frequency: ${frequency}`)

  const next = new Date(date)
  if (step.unit === 'day') next.setUTCDate(next.getUTCDate() + step.amount)
  else next.setUTCMonth(next.getUTCMonth() + step.amount)
  return next
}

function generateOccurrences(rule, windowStart, windowEnd) {
  const lastAllowed = rule.endDate && new Date(rule.endDate) < windowEnd ? new Date(rule.endDate) : windowEnd

  let cursor = new Date(rule.startDate)
  while (cursor < windowStart) cursor = nextOccurrence(cursor, rule.frequency)

  const occurrences = []
  for (; cursor <= lastAllowed; cursor = nextOccurrence(cursor, rule.frequency)) {
    occurrences.push(new Date(cursor))
  }
  return occurrences
}

module.exports = { generateOccurrences }
