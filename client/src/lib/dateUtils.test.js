import { describe, it, expect } from 'vitest'
import { addDaysIso, weekRangeIso, shiftMonth, yearMonthOf } from './dateUtils'

describe('addDaysIso', () => {
  it('adds days within the same month', () => {
    expect(addDaysIso('2026-09-05', 3)).toBe('2026-09-08')
  })

  it('rolls over into the next month', () => {
    expect(addDaysIso('2026-09-29', 3)).toBe('2026-10-02')
  })

  it('supports negative deltas', () => {
    expect(addDaysIso('2026-09-01', -1)).toBe('2026-08-31')
  })
})

describe('weekRangeIso', () => {
  it('returns the Sunday-to-Saturday range when given a Saturday', () => {
    expect(weekRangeIso('2026-09-05')).toEqual({ from: '2026-08-30', to: '2026-09-05' })
  })

  it('returns the Sunday-to-Saturday range when given a midweek day', () => {
    expect(weekRangeIso('2026-09-02')).toEqual({ from: '2026-08-30', to: '2026-09-05' })
  })
})

describe('shiftMonth', () => {
  it('moves forward across the year boundary', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
  })

  it('moves backward across the year boundary', () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
  })
})

describe('yearMonthOf', () => {
  it('reads the calendar month of a UTC-midnight timestamp', () => {
    expect(yearMonthOf('2026-09-01T00:00:00.000Z')).toEqual({ year: 2026, month: 9 })
  })
})
