const TRANSFER_PREFIXES = ['pix transf', 'pix qrs', 'ted', 'dev pix']
const MIN_NAME_TOKEN_LENGTH = 4

const CATEGORY_HINTS = [
  { pattern: /REMUNERACAO\/SALARIO/i, categoryName: 'Salário', type: 'income' },
  { pattern: /REND\s*PAGO\s*APLIC/i, categoryName: 'Rendimento de investimento', type: 'income' },
  { pattern: /^(JUROS LIMITE DA CONTA|IOF)\b/i, categoryName: 'Outros', type: 'expense' },
]

const COMBINING_DIACRITICS = /[̀-ͯ]/g
const TRAILING_DAY_MONTH = /\d{2}\/\d{2}$/

function stripAccents(value) {
  return value.normalize('NFD').replace(COMBINING_DIACRITICS, '')
}

function normalizeMatchKey(rawDescription) {
  return stripAccents(rawDescription.replace(TRAILING_DAY_MONTH, ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function suggestCategoryName(rawDescription) {
  const hint = CATEGORY_HINTS.find(({ pattern }) => pattern.test(rawDescription))
  return hint ? { categoryName: hint.categoryName, type: hint.type } : null
}

function looksLikeTransfer(rawDescription) {
  const lower = rawDescription.toLowerCase()
  return TRANSFER_PREFIXES.some((prefix) => lower.startsWith(prefix))
}

function significantTokens(text) {
  return text.split(/[^a-z0-9]+/).filter((token) => token.length >= MIN_NAME_TOKEN_LENGTH)
}

function accountKeywords(account) {
  return [account.name, account.owner]
    .filter(Boolean)
    .map((keyword) => stripAccents(keyword).toLowerCase())
    .filter((keyword) => keyword.length >= MIN_NAME_TOKEN_LENGTH)
}

function isPossiblyTruncatedMatch(token, keyword) {
  return token.startsWith(keyword) || keyword.startsWith(token)
}

function detectTransferAccount(rawDescription, accounts, statementAccountId) {
  if (!looksLikeTransfer(rawDescription)) return null

  const tokens = significantTokens(normalizeMatchKey(rawDescription))
  const mentionsAccount = (account) =>
    accountKeywords(account).some((keyword) => tokens.some((token) => isPossiblyTruncatedMatch(token, keyword)))

  return accounts.find((account) => account.id !== statementAccountId && mentionsAccount(account)) ?? null
}

module.exports = { normalizeMatchKey, suggestCategoryName, detectTransferAccount }
