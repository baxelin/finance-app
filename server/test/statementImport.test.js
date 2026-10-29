const { test } = require('node:test')
const assert = require('node:assert/strict')
const { parseItauStatement } = require('../src/lib/statementParser/itau')
const { normalizeMatchKey, suggestCategoryName, detectTransferAccount } = require('../src/lib/importMatching')
const { generateOccurrences } = require('../src/lib/recurrence')

const utc = (year, month, day) => new Date(Date.UTC(year, month - 1, day))

test('parses transaction lines and skips headers and daily balances', () => {
  const text = [
    'Extrato conta corrente',
    'data lançamentos valor (R$)',
    '02/03/2026 PIX TRANSF BRUNO 01/03 -1.250,00',
    '02/03/2026 SALDO DO DIA 3.000,00',
    '05/03/2026 REMUNERACAO/SALARIO 6.500,00',
  ].join('\n')

  assert.deepEqual(parseItauStatement(text), [
    { rawDescription: 'PIX TRANSF BRUNO 01/03', date: utc(2026, 3, 2), amount: 1250, type: 'expense' },
    { rawDescription: 'REMUNERACAO/SALARIO', date: utc(2026, 3, 5), amount: 6500, type: 'income' },
  ])
})

test('match keys ignore accents, casing, spacing and trailing dates', () => {
  assert.equal(normalizeMatchKey('PAG  Padaria   São João 12/03'), 'pag padaria sao joao')
})

test('known description patterns suggest a category', () => {
  assert.deepEqual(suggestCategoryName('REMUNERACAO/SALARIO'), { categoryName: 'Salário', type: 'income' })
  assert.equal(suggestCategoryName('MERCADO CENTRAL'), null)
})

test('transfers to a household account are detected even when the name is truncated', () => {
  const accounts = [
    { id: 1, name: 'Ana', owner: 'Ana' },
    { id: 2, name: 'Bruno', owner: 'Bruno' },
    { id: 3, name: 'Casal', owner: null },
  ]

  assert.equal(detectTransferAccount('PIX TRANSF BRUN 01/03', accounts, 1)?.id, 2)
  assert.equal(detectTransferAccount('PIX TRANSF CASAL 01/03', accounts, 1)?.id, 3)
  assert.equal(detectTransferAccount('PIX TRANSF MERCADO 01/03', accounts, 1), null)
  assert.equal(detectTransferAccount('PAG BOLETO BRUNO', accounts, 1), null)
})

test('recurrence occurrences respect the window and the rule end date', () => {
  const rule = { startDate: utc(2026, 1, 15), endDate: utc(2026, 5, 1), frequency: 'monthly' }

  assert.deepEqual(generateOccurrences(rule, utc(2026, 2, 1), utc(2026, 12, 31)), [
    utc(2026, 2, 15),
    utc(2026, 3, 15),
    utc(2026, 4, 15),
  ])
})
