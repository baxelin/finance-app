const { test } = require('node:test')
const assert = require('node:assert/strict')
const { computeCompetenceDate, addMonthsClampToDay } = require('../src/lib/invoiceCycle')

const utc = (year, month, day) => new Date(Date.UTC(year, month - 1, day))

test('purchase on or before the closing day is due the following month', () => {
  assert.deepEqual(computeCompetenceDate(utc(2026, 3, 10), 10, 17), utc(2026, 4, 17))
})

test('purchase after the closing day rolls into the next invoice', () => {
  assert.deepEqual(computeCompetenceDate(utc(2026, 3, 11), 10, 17), utc(2026, 5, 17))
})

test('invoice cycle wraps across the year boundary', () => {
  assert.deepEqual(computeCompetenceDate(utc(2026, 12, 20), 10, 5), utc(2027, 2, 5))
  assert.deepEqual(computeCompetenceDate(utc(2026, 11, 5), 10, 5), utc(2026, 12, 5))
})

test('due day is clamped to the last day of short months', () => {
  assert.deepEqual(computeCompetenceDate(utc(2026, 1, 5), 25, 31), utc(2026, 2, 28))
})

test('addMonthsClampToDay moves forward and backward across years', () => {
  assert.deepEqual(addMonthsClampToDay(utc(2026, 11, 15), 3, 31), utc(2027, 2, 28))
  assert.deepEqual(addMonthsClampToDay(utc(2026, 2, 15), -3, 30), utc(2025, 11, 30))
  assert.deepEqual(addMonthsClampToDay(utc(2026, 1, 31), 24, 31), utc(2028, 1, 31))
})
