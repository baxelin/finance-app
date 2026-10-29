import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatMonthLabel } from './format'

describe('formatCurrency', () => {
  it('formats numbers as BRL currency', () => {
    expect(formatCurrency(1234.5)).toBe('R$ 1.234,50')
  })

  it('treats null/undefined as zero', () => {
    expect(formatCurrency(null)).toBe('R$ 0,00')
    expect(formatCurrency(undefined)).toBe('R$ 0,00')
  })
})

describe('formatDate', () => {
  it('returns an empty string for falsy input', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate('')).toBe('')
  })

  it('formats a UTC-midnight ISO string using the UTC day', () => {
    expect(formatDate('2026-09-05T00:00:00.000Z')).toBe('05/09/2026')
  })
})

describe('formatMonthLabel', () => {
  it('capitalizes the localized month/year label', () => {
    expect(formatMonthLabel(2026, 9)).toBe('Setembro de 2026')
  })
})
