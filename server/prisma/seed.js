require('dotenv/config')
const { PrismaClient } = require('@prisma/client')
const { defaultIconFor, defaultColorFor } = require('./categoryStyleMap')

const prisma = new PrismaClient()

const DEFAULT_CATEGORIES = {
  expense: {
    Moradia: ['Aluguel', 'Condomínio', 'Luz', 'Água', 'Internet', 'Gás', 'Manutenção'],
    Alimentação: ['Mercado', 'Restaurante', 'Delivery', 'Padaria'],
    Transporte: ['Combustível', 'Uber/99', 'Transporte público', 'Manutenção veículo', 'Estacionamento'],
    Saúde: ['Plano de saúde', 'Farmácia', 'Consultas', 'Academia'],
    Lazer: ['Cinema/streaming', 'Viagens', 'Bares', 'Hobbies'],
    Educação: ['Cursos', 'Livros', 'Material'],
    Assinaturas: ['Streaming', 'Softwares', 'Serviços recorrentes'],
    'Compras pessoais': ['Roupas', 'Eletrônicos', 'Presentes'],
    Pets: ['Ração', 'Veterinário', 'Petshop'],
    Transferência: [],
    Outros: [],
  },
  income: {
    Salário: [],
    'Freelance/Renda extra': [],
    'Rendimento de investimento': [],
    Reembolso: [],
    Outros: [],
  },
}

function householdAccounts() {
  const partners = [process.env.PARTNER_A_NAME || 'Ana', process.env.PARTNER_B_NAME || 'Bruno']
  return [
    ...partners.map((name) => ({ name, type: 'individual', owner: name })),
    { name: process.env.JOINT_ACCOUNT_NAME || 'Casal', type: 'joint', owner: null },
  ]
}

async function seedAccounts(client = prisma) {
  const existing = await client.account.count()
  if (existing > 0) {
    console.log('Accounts already seeded, skipping.')
    return
  }

  await client.account.createMany({ data: householdAccounts() })
  console.log('Seeded household accounts.')
}

async function seedCategories(client = prisma) {
  const existing = await client.category.count()
  if (existing > 0) {
    console.log('Categories already seeded, skipping.')
    return
  }

  for (const [type, groups] of Object.entries(DEFAULT_CATEGORIES)) {
    for (const [parentName, children] of Object.entries(groups)) {
      const parent = await client.category.create({
        data: { name: parentName, type, isDefault: true, icon: defaultIconFor(parentName), color: defaultColorFor(parentName) },
      })
      if (children.length) {
        await client.category.createMany({
          data: children.map((name) => ({
            name,
            type,
            isDefault: true,
            parentId: parent.id,
            icon: defaultIconFor(parentName),
            color: defaultColorFor(parentName),
          })),
        })
      }
    }
  }
  console.log('Seeded default categories.')
}

async function main() {
  await seedAccounts()
  await seedCategories()
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

module.exports = { seedAccounts, seedCategories, DEFAULT_CATEGORIES }
