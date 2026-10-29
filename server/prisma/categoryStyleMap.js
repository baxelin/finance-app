const ICON_BY_NAME = {
  Moradia: 'home',
  Alimentação: 'food',
  Transporte: 'car',
  Saúde: 'health',
  Lazer: 'party',
  Educação: 'education',
  Assinaturas: 'subscriptions',
  'Compras pessoais': 'shopping',
  Pets: 'pets',
  Transferência: 'transfer',
  Outros: 'other',
  Salário: 'wallet',
  'Freelance/Renda extra': 'briefcase',
  'Rendimento de investimento': 'trending',
  Reembolso: 'refund',
}

const COLOR_BY_NAME = {
  Moradia: '#a16207',
  Alimentação: '#16a34a',
  Transporte: '#eab308',
  Saúde: '#dc2626',
  Lazer: '#db2777',
  Educação: '#7c3aed',
  Assinaturas: '#0ea5e9',
  'Compras pessoais': '#db2777',
  Pets: '#059669',
  Transferência: '#64748b',
  Outros: '#64748b',
  Salário: '#16a34a',
  'Freelance/Renda extra': '#2563eb',
  'Rendimento de investimento': '#16a34a',
  Reembolso: '#0ea5e9',
}

const PALETTE = ['#16a34a', '#0ea5e9', '#db2777', '#a855f7', '#f97316', '#ef4444', '#14b8a6', '#84cc16', '#6366f1', '#0f172a', '#eab308', '#64748b']

function colorForKey(key) {
  const str = String(key ?? '')
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

function defaultIconFor(name) {
  return ICON_BY_NAME[name] || 'tag'
}

function defaultColorFor(name) {
  return COLOR_BY_NAME[name] || colorForKey(name)
}

module.exports = { defaultIconFor, defaultColorFor }
