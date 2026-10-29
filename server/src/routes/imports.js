const express = require('express')
const multer = require('multer')
const { PDFParse } = require('pdf-parse')
const prisma = require('../lib/prisma')
const { parseItauStatement } = require('../lib/statementParser/itau')
const { normalizeMatchKey, suggestCategoryName, detectTransferAccount } = require('../lib/importMatching')
const { toIsoDate } = require('../lib/dates')

const router = express.Router()

const MAX_FILES = 5
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
const INTERNAL_TRANSFER_DESCRIPTION = 'Transferência entre contas'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_FILES },
  fileFilter: (req, file, accept) => {
    if (file.mimetype !== 'application/pdf') return accept(new Error('Apenas arquivos PDF são suportados por enquanto'))
    accept(null, true)
  },
})

function uploadStatements(req, res, next) {
  upload.array('files', MAX_FILES)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    next()
  })
}

function isSameDay(a, b) {
  return toIsoDate(a) === toIsoDate(b)
}

async function extractStatementRows(files) {
  const rows = []
  for (const file of files) {
    const parser = new PDFParse({ data: file.buffer })
    const { text } = await parser.getText()
    await parser.destroy()
    rows.push(...parseItauStatement(text).map((row) => ({ ...row, sourceFile: file.originalname })))
  }
  return rows
}

async function learnedRulesFor(rows) {
  const matchKeys = [...new Set(rows.map((row) => normalizeMatchKey(row.rawDescription)))]
  const rules = await prisma.importRule.findMany({ where: { matchKey: { in: matchKeys } } })
  return new Map(rules.map((rule) => [rule.matchKey, rule]))
}

function categoryLookup(categories) {
  const byTypeAndName = new Map(categories.map((category) => [`${category.type}:${category.name}`, category]))
  return (type, name) => byTypeAndName.get(`${type}:${name}`)?.id ?? null
}

function suggestTransfer(row, counterpartAccount, statementAccountId) {
  const isOutgoing = row.type === 'expense'
  return {
    ...row,
    description: row.rawDescription,
    type: 'transfer',
    categoryId: null,
    accountId: isOutgoing ? statementAccountId : counterpartAccount.id,
    destinationAccountId: isOutgoing ? counterpartAccount.id : statementAccountId,
    isTransferSuggested: true,
  }
}

function suggestCategorizedEntry(row, learnedRule, findCategoryId, statementAccountId) {
  const hint = learnedRule ? null : suggestCategoryName(row.rawDescription)
  return {
    ...row,
    description: learnedRule?.description ?? row.rawDescription,
    categoryId: learnedRule ? learnedRule.categoryId : hint && findCategoryId(hint.type, hint.categoryName),
    accountId: statementAccountId,
    destinationAccountId: null,
    isTransferSuggested: false,
  }
}

function involvedAccountIds(entry) {
  return [entry.accountId, entry.destinationAccountId].filter(Boolean)
}

function sharesAnAccount(a, b) {
  const accountsOfB = involvedAccountIds(b)
  return involvedAccountIds(a).some((id) => accountsOfB.includes(id))
}

async function existingTransactionsAround(suggestions) {
  const timestamps = suggestions.map((suggestion) => suggestion.date.getTime())
  const accountIds = [...new Set(suggestions.flatMap(involvedAccountIds))]
  return prisma.transaction.findMany({
    where: {
      competenceDate: { gte: new Date(Math.min(...timestamps)), lte: new Date(Math.max(...timestamps)) },
      OR: [{ accountId: { in: accountIds } }, { destinationAccountId: { in: accountIds } }],
    },
  })
}

function findDuplicate(suggestion, existing, earlierInBatch) {
  const stored = existing.find(
    (transaction) =>
      transaction.amount === suggestion.amount &&
      isSameDay(transaction.competenceDate, suggestion.date) &&
      sharesAnAccount(transaction, suggestion)
  )
  if (stored) return { with: 'existing', description: stored.description, date: toIsoDate(stored.competenceDate) }

  const repeated = earlierInBatch.find(
    (other) =>
      other.amount === suggestion.amount &&
      isSameDay(other.date, suggestion.date) &&
      other.accountId === suggestion.accountId &&
      other.destinationAccountId === suggestion.destinationAccountId
  )
  if (repeated) return { with: 'batch', description: repeated.description, date: toIsoDate(repeated.date) }

  return null
}

router.post('/parse', uploadStatements, async (req, res) => {
  try {
    const statementAccountId = Number(req.body.accountId)
    if (!statementAccountId) return res.status(400).json({ error: 'accountId is required' })
    if (!req.files?.length) return res.status(400).json({ error: 'At least one PDF file is required' })

    const [accounts, categories] = await Promise.all([prisma.account.findMany(), prisma.category.findMany()])
    if (!accounts.some((account) => account.id === statementAccountId)) return res.status(404).json({ error: 'Account not found' })

    const statementRows = await extractStatementRows(req.files)
    if (statementRows.length === 0) return res.json({ rows: [] })

    const learnedRules = await learnedRulesFor(statementRows)
    const findCategoryId = categoryLookup(categories)

    const suggestions = statementRows.map((row) => {
      const counterpartAccount = detectTransferAccount(row.rawDescription, accounts, statementAccountId)
      if (counterpartAccount) return suggestTransfer(row, counterpartAccount, statementAccountId)
      const learnedRule = learnedRules.get(normalizeMatchKey(row.rawDescription))
      return suggestCategorizedEntry(row, learnedRule, findCategoryId, statementAccountId)
    })

    const existing = await existingTransactionsAround(suggestions)
    const batchId = Date.now()
    const rows = suggestions.map((suggestion, index) => ({
      ...suggestion,
      tempId: `${batchId}-${index}`,
      date: toIsoDate(suggestion.date),
      conflict: findDuplicate(suggestion, existing, suggestions.slice(0, index)),
    }))

    res.json({ rows })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

function toTransactionData(row) {
  const date = new Date(row.date)
  const shared = { amount: Number(row.amount), date, competenceDate: date, accountId: Number(row.accountId), status: 'confirmed' }

  if (row.type === 'transfer') {
    return {
      ...shared,
      type: 'transfer',
      description: row.description || INTERNAL_TRANSFER_DESCRIPTION,
      destinationAccountId: Number(row.destinationAccountId),
    }
  }
  return { ...shared, type: row.type, description: row.description, categoryId: row.categoryId ? Number(row.categoryId) : null }
}

function rememberCategorization(row) {
  const matchKey = normalizeMatchKey(row.rawDescription)
  const rule = { description: row.description, type: row.type, categoryId: Number(row.categoryId) }
  return prisma.importRule.upsert({ where: { matchKey }, create: { matchKey, ...rule }, update: rule })
}

router.post('/commit', async (req, res) => {
  try {
    const { rows } = req.body
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'rows is required' })

    const created = await prisma.$transaction(rows.map((row) => prisma.transaction.create({ data: toTransactionData(row) })))

    const categorizedRows = rows.filter((row) => row.type !== 'transfer' && row.categoryId && row.rawDescription)
    await Promise.all(categorizedRows.map(rememberCategorization))

    res.status(201).json({ created: created.length })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
