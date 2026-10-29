require('dotenv/config')
const { PrismaClient } = require('@prisma/client')
const { seedAccounts, seedCategories } = require('./seed')
const { buildInstallmentPlan } = require('../src/lib/installments')
const { computeCompetenceDate } = require('../src/lib/invoiceCycle')
const { generateOccurrences } = require('../src/lib/recurrence')
const { todayUtc } = require('../src/lib/dates')

const prisma = new PrismaClient()

const HISTORY_MONTHS = 4
const RECURRENCE_GENERATION_HORIZON_MONTHS = 12

const today = todayUtc()
const historyStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - HISTORY_MONTHS, 1))

function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = seededRandom(42)
const between = (min, max) => Math.round((min + random() * (max - min)) * 100) / 100
const pick = (items) => items[Math.floor(random() * items.length)]

function daysUntilToday(start) {
  const days = []
  for (let day = new Date(start); day <= today; day.setUTCDate(day.getUTCDate() + 1)) days.push(new Date(day))
  return days
}

function statusFor(date) {
  return date <= today ? 'confirmed' : 'pending'
}

async function loadLookups() {
  const [accounts, categories] = await Promise.all([prisma.account.findMany({ orderBy: { id: 'asc' } }), prisma.category.findMany()])
  const [partnerA, partnerB] = accounts.filter((account) => account.type === 'individual')
  const joint = accounts.find((account) => account.type === 'joint')
  const categoryId = (name, type = 'expense') => categories.find((category) => category.name === name && category.type === type).id
  return { partnerA, partnerB, joint, categoryId }
}

async function createRecurring({ description, amount, type, day, frequency = 'monthly', autoConfirm = false, accountId, categoryId }) {
  const startDate = new Date(Date.UTC(historyStart.getUTCFullYear(), historyStart.getUTCMonth(), day))
  const horizon = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + RECURRENCE_GENERATION_HORIZON_MONTHS, day))
  const rule = await prisma.recurrenceRule.create({
    data: { description, amount, type, frequency, startDate, autoConfirm, accountId, categoryId },
  })
  await prisma.transaction.createMany({
    data: generateOccurrences(rule, startDate, horizon).map((date) => ({
      description,
      amount,
      type,
      date,
      competenceDate: date,
      accountId,
      categoryId,
      recurrenceRuleId: rule.id,
      status: statusFor(date),
    })),
  })
}

async function seedRecurring({ partnerA, partnerB, joint, categoryId }) {
  const salary = categoryId('Salário', 'income')
  const recurring = [
    { description: `Salário ${partnerA.name}`, amount: 7800, type: 'income', day: 5, autoConfirm: true, accountId: partnerA.id, categoryId: salary },
    { description: `Salário ${partnerB.name}`, amount: 6400, type: 'income', day: 5, autoConfirm: true, accountId: partnerB.id, categoryId: salary },
    { description: 'Aluguel', amount: 2900, type: 'expense', day: 10, accountId: joint.id, categoryId: categoryId('Aluguel') },
    { description: 'Condomínio', amount: 680, type: 'expense', day: 10, accountId: joint.id, categoryId: categoryId('Condomínio') },
    { description: 'Internet fibra', amount: 119.9, type: 'expense', day: 15, accountId: joint.id, categoryId: categoryId('Internet') },
    { description: 'Energia elétrica', amount: 245.3, type: 'expense', day: 18, accountId: joint.id, categoryId: categoryId('Luz') },
    { description: 'Plano de saúde', amount: 890, type: 'expense', day: 8, accountId: joint.id, categoryId: categoryId('Plano de saúde') },
    { description: 'Streaming de vídeo', amount: 55.9, type: 'expense', day: 12, accountId: partnerA.id, categoryId: categoryId('Streaming') },
    { description: 'Academia', amount: 129.9, type: 'expense', day: 7, accountId: partnerB.id, categoryId: categoryId('Academia') },
    { description: 'Seguro do carro', amount: 1980, type: 'expense', day: 20, frequency: 'annual', accountId: partnerB.id, categoryId: categoryId('Manutenção veículo') },
  ]
  for (const entry of recurring) await createRecurring(entry)
}

async function seedOpeningBalances({ partnerA, partnerB, joint, categoryId }) {
  const openingBalances = [
    { account: partnerA, amount: 9500 },
    { account: partnerB, amount: 7200 },
    { account: joint, amount: 6000 },
  ]
  await prisma.transaction.createMany({
    data: openingBalances.map(({ account, amount }) => ({
      type: 'income',
      description: 'Saldo inicial',
      amount,
      date: historyStart,
      competenceDate: historyStart,
      accountId: account.id,
      categoryId: categoryId('Outros', 'income'),
      status: 'confirmed',
    })),
  })
}

async function seedHouseholdTransfers({ partnerA, partnerB, joint }) {
  const transfers = []
  for (let offset = 0; offset <= HISTORY_MONTHS; offset += 1) {
    const date = new Date(Date.UTC(historyStart.getUTCFullYear(), historyStart.getUTCMonth() + offset, 6))
    if (date > today) break
    for (const partner of [partnerA, partnerB]) {
      transfers.push({
        type: 'transfer',
        description: 'Contribuição para a conta do casal',
        amount: 3900,
        date,
        competenceDate: date,
        accountId: partner.id,
        destinationAccountId: joint.id,
        status: 'confirmed',
      })
    }
  }
  await prisma.transaction.createMany({ data: transfers })
}

async function seedDailySpending({ partnerA, partnerB, joint, categoryId }) {
  const habits = [
    { weekdays: [6], description: 'Supermercado', range: [280, 520], accountId: joint.id, category: 'Mercado' },
    { weekdays: [2, 4], description: 'Hortifruti', range: [45, 110], accountId: joint.id, category: 'Mercado' },
    { weekdays: [0], description: 'Padaria', range: [28, 65], accountId: joint.id, category: 'Padaria' },
    { weekdays: [1, 4], description: 'Posto de combustível', range: [180, 260], accountId: partnerB.id, category: 'Combustível', chance: 0.5 },
    { weekdays: [5], description: 'Jantar fora', range: [140, 290], accountId: joint.id, category: 'Restaurante', chance: 0.7 },
    { weekdays: [3], description: 'Farmácia', range: [35, 140], accountId: partnerA.id, category: 'Farmácia', chance: 0.4 },
    { weekdays: [1, 2, 3, 4, 5], description: 'Almoço', range: [32, 58], accountId: partnerA.id, category: 'Restaurante', chance: 0.35 },
  ]

  const expenses = daysUntilToday(historyStart).flatMap((date) =>
    habits
      .filter((habit) => habit.weekdays.includes(date.getUTCDay()) && random() < (habit.chance ?? 1))
      .map((habit) => ({
        type: 'expense',
        description: habit.description,
        amount: between(...habit.range),
        date,
        competenceDate: date,
        accountId: habit.accountId,
        categoryId: categoryId(habit.category),
        status: 'confirmed',
      }))
  )
  await prisma.transaction.createMany({ data: expenses })
}

async function seedCards({ partnerA, partnerB, categoryId }) {
  const cardA = await prisma.creditCard.create({ data: { name: 'Visa Platinum', accountId: partnerA.id, closingDay: 3, dueDay: 10 } })
  const cardB = await prisma.creditCard.create({ data: { name: 'Mastercard Gold', accountId: partnerB.id, closingDay: 20, dueDay: 27 } })

  const purchases = [
    { card: cardA, descriptions: ['Delivery', 'Delivery de pizza'], range: [45, 120], category: 'Delivery', perWeek: 1.5 },
    { card: cardA, descriptions: ['Loja de roupas', 'Calçados'], range: [120, 380], category: 'Roupas', perWeek: 0.3 },
    { card: cardB, descriptions: ['Corrida de app', 'Corrida de app'], range: [18, 52], category: 'Uber/99', perWeek: 2 },
    { card: cardB, descriptions: ['Cinema', 'Show', 'Bar com amigos'], range: [60, 240], category: 'Bares', perWeek: 0.6 },
    { card: cardB, descriptions: ['Livraria'], range: [45, 130], category: 'Livros', perWeek: 0.25 },
  ]

  const cardPurchases = daysUntilToday(historyStart).flatMap((date) =>
    purchases
      .filter((purchase) => random() < purchase.perWeek / 7)
      .map(({ card, descriptions, range, category }) => {
        const competenceDate = computeCompetenceDate(date, card.closingDay, card.dueDay)
        return {
          type: 'expense',
          description: pick(descriptions),
          amount: between(...range),
          date,
          competenceDate,
          accountId: card.accountId,
          creditCardId: card.id,
          categoryId: categoryId(category),
          status: statusFor(competenceDate),
        }
      })
  )
  await prisma.transaction.createMany({ data: cardPurchases })

  const installmentPurchases = [
    { card: cardB, description: 'Notebook', totalAmount: 5400, installments: 10, monthsAgo: 3, category: 'Eletrônicos' },
    { card: cardA, description: 'Sofá retrátil', totalAmount: 3600, installments: 6, monthsAgo: 2, category: 'Manutenção' },
    { card: cardA, description: 'Passagens aéreas', totalAmount: 2380, installments: 4, monthsAgo: 0, category: 'Viagens' },
  ]
  for (const { card, description, totalAmount, installments, monthsAgo, category } of installmentPurchases) {
    const purchaseDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsAgo, 2))
    const plan = buildInstallmentPlan({ purchaseDate, closingDay: card.closingDay, dueDay: card.dueDay, mode: 'total', totalAmount, installments })
    await prisma.transaction.createMany({
      data: plan.map((installment) => ({
        ...installment,
        type: 'expense',
        description,
        accountId: card.accountId,
        creditCardId: card.id,
        categoryId: categoryId(category),
        status: statusFor(installment.competenceDate),
      })),
    })
  }
}

async function seedInvestments({ partnerA, joint }) {
  const investments = [
    { name: 'Reserva de emergência', accountId: joint.id, initialValue: 18000, monthlyGrowth: 1250 },
    { name: 'Tesouro IPCA+ 2035', accountId: joint.id, initialValue: 12500, monthlyGrowth: 420 },
    { name: 'Fundo de ações', accountId: partnerA.id, initialValue: 8200, monthlyGrowth: 310 },
  ]

  for (const { name, accountId, initialValue, monthlyGrowth } of investments) {
    const values = Array.from({ length: HISTORY_MONTHS + 1 }, (_, index) => Math.round(initialValue + monthlyGrowth * index + between(-150, 150)))
    const investment = await prisma.investment.create({ data: { name, accountId, currentValue: values.at(-1) } })
    await prisma.investmentEntry.createMany({
      data: values.map((value, index) => ({
        investmentId: investment.id,
        value,
        date: new Date(Date.UTC(historyStart.getUTCFullYear(), historyStart.getUTCMonth() + index, 1)),
      })),
    })
  }
}

async function seedBudgets({ categoryId }) {
  const budgets = [
    { category: 'Alimentação', monthlyLimit: 4200 },
    { category: 'Lazer', monthlyLimit: 600 },
    { category: 'Transporte', monthlyLimit: 1900 },
    { category: 'Compras pessoais', monthlyLimit: 800 },
  ]
  await prisma.budget.createMany({
    data: budgets.map(({ category, monthlyLimit }) => ({ categoryId: categoryId(category), monthlyLimit })),
  })
}

async function main() {
  if ((await prisma.transaction.count()) > 0) {
    console.error('Database already has transactions. Use an empty database to load the demo data.')
    process.exitCode = 1
    return
  }

  await seedAccounts(prisma)
  await seedCategories(prisma)

  const lookups = await loadLookups()
  await seedOpeningBalances(lookups)
  await seedRecurring(lookups)
  await seedHouseholdTransfers(lookups)
  await seedDailySpending(lookups)
  await seedCards(lookups)
  await seedInvestments(lookups)
  await seedBudgets(lookups)
  console.log('Demo data loaded.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
