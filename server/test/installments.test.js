const { test } = require('node:test')
const assert = require('node:assert/strict')
const { buildInstallmentPlan } = require('../src/lib/installments')

const utc = (year, month, day) => new Date(Date.UTC(year, month - 1, day))
const card = { closingDay: 10, dueDay: 17 }

test('total mode splits the amount and puts the rounding remainder on the last installment', () => {
  const plan = buildInstallmentPlan({ ...card, purchaseDate: utc(2026, 3, 5), mode: 'total', totalAmount: 100, installments: 3 })

  assert.deepEqual(plan.map((p) => p.amount), [33.33, 33.33, 33.34])
  assert.deepEqual(plan.map((p) => p.competenceDate), [utc(2026, 4, 17), utc(2026, 5, 17), utc(2026, 6, 17)])
  assert.deepEqual(plan.map((p) => p.installmentNumber), [1, 2, 3])
  assert.ok(plan.every((p) => p.installmentTotal === 3))
  assert.equal(new Set(plan.map((p) => p.installmentGroupId)).size, 1)
})

test('per-installment mode derives the count from the final invoice month', () => {
  const plan = buildInstallmentPlan({
    ...card,
    purchaseDate: utc(2026, 3, 5),
    mode: 'perInstallment',
    perInstallmentAmount: 50,
    endMonth: { year: 2026, month: 7 },
  })

  assert.equal(plan.length, 4)
  assert.ok(plan.every((p) => p.amount === 50))
})

test('per-installment mode rejects a final month before the first invoice', () => {
  assert.throws(() =>
    buildInstallmentPlan({
      ...card,
      purchaseDate: utc(2026, 3, 5),
      mode: 'perInstallment',
      perInstallmentAmount: 50,
      endMonth: { year: 2026, month: 2 },
    })
  )
})

test('unknown modes are rejected', () => {
  assert.throws(() => buildInstallmentPlan({ ...card, purchaseDate: utc(2026, 3, 5), mode: 'weird' }))
})
