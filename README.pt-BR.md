<div align="center">

# FinApp

**Gerenciador de finanças para casais: contas individuais e conjunta, faturas de cartão, parcelamentos, contas recorrentes, orçamentos, previsão de 3 meses e importação de extratos.**

[![CI](https://github.com/baxelin/finance-app/actions/workflows/ci.yml/badge.svg)](https://github.com/baxelin/finance-app/actions/workflows/ci.yml)
![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24-5fa04e?logo=nodedotjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ed?logo=docker&logoColor=white)

[English](README.md) · Português

![Dashboard](docs/screenshots/dashboard.png)

</div>

## Por quê

A maioria dos apps de orçamento é pensada para uma pessoa só. Um casal costuma organizar o dinheiro em **três** lugares: a conta de cada um e uma conta conjunta, além de cartões de crédito cujas compras só pesam no saldo quando a fatura vence. O FinApp modela isso diretamente, para que o saldo mostrado bata com o que vai estar de fato no banco.

## Funcionalidades

| | |
| --- | --- |
| **Contas** | Duas contas individuais e uma conjunta, com saldo atual e saldo previsto do mês. Transferências entre elas são registradas nos dois lados. |
| **Faturas de cartão** | Cada compra entra na fatura correta conforme os dias de fechamento e vencimento do cartão. O gasto no cartão só afeta o saldo quando a fatura é paga. |
| **Parcelamentos** | Informe "valor total + nº de parcelas" (os centavos de arredondamento vão para a última) ou "valor da parcela + mês final". As parcelas podem ser editadas ou excluídas em grupo. |
| **Recorrentes** | Frequências de diária a anual. A confirmação automática (ex.: salário) só confirma uma ocorrência quando a data dela chega, então dinheiro futuro nunca infla o saldo de hoje. |
| **Previsão** | Projeta os próximos 3 meses a partir dos lançamentos agendados e da média dos gastos variáveis recentes. |
| **Orçamentos** | Limite mensal por categoria, somando também os gastos das subcategorias. |
| **Importação de extrato** | Envie o PDF do extrato (formato Itaú). O FinApp sugere categorias, aprende com as suas correções, detecta transferências entre as contas do casal e aponta duplicatas antes de salvar. |
| **Investimentos** | Acompanhe a evolução do valor de cada investimento. |

## Telas

| Transações | Novo lançamento (compra parcelada no cartão) |
| --- | --- |
| ![Transações](docs/screenshots/transactions.png) | ![Novo lançamento](docs/screenshots/new-transaction.png) |
| **Recorrentes** | **Faturas do cartão** |
| ![Recorrentes](docs/screenshots/recurring.png) | ![Faturas](docs/screenshots/card-invoices.png) |
| **Investimentos** | **Importação de extrato** |
| ![Investimento](docs/screenshots/investment.png) | ![Importação](docs/screenshots/import.png) |

<details>
<summary>Categorias</summary>

![Categorias](docs/screenshots/categories.png)

</details>

## Stack

- **Frontend:** Vue 3 (Composition API, `<script setup>`), Vite, Pinia, Vue Router, Tailwind CSS 4, Chart.js, ícones Lucide
- **Backend:** Node.js 24, Express 5, Prisma ORM, SQLite (via Prisma: migrar para PostgreSQL é só trocar o provider)
- **Testes:** `node:test` para as regras de negócio, Vitest no client
- **Entrega:** imagem Docker multi-stage servindo API e SPA no mesmo processo, CI no GitHub Actions, imagem multi-arquitetura publicada no GHCR

## Arquitetura

```
finance-app/
├── client/                 SPA em Vue
│   └── src/
│       ├── views/          um componente por página
│       ├── components/     formulários, modais e os componentes base em ui/
│       ├── stores/         stores Pinia (contas, cartões, categorias)
│       ├── composables/
│       └── lib/            cliente da API, formatação, datas, registro de ícones
├── server/                 API Express
│   ├── src/
│   │   ├── routes/         camada HTTP enxuta, um router por recurso
│   │   └── lib/            regras de negócio: ciclo de fatura, parcelas, recorrência,
│   │                       saldos, previsão, leitura e matching de extratos
│   ├── prisma/             schema, migrations, seed padrão e seed de demonstração
│   └── test/
├── Dockerfile
└── .github/workflows/      CI e CD
```

As regras de negócio ficam em módulos pequenos e puros em `server/src/lib`, com testes unitários próprios. As rotas só traduzem HTTP em chamadas a esses módulos e ao Prisma.

## Como rodar

Requer **Node.js 24+**.

```bash
npm run install:all                  # instala as dependências do server e do client
cp server/.env.example server/.env   # caminho do banco, porta e nomes das contas
npm run db:migrate                   # cria o banco SQLite
npm run db:seed:demo                 # opcional: carrega ~4 meses de dados de exemplo
npm run dev                          # API na porta 3001, SPA na 5173
```

Acesse http://localhost:5173. Para começar com o app vazio, rode `npm run db:seed` no lugar do seed de demonstração; ele cria só as contas e as categorias padrão.

### Variáveis de ambiente (`server/.env`)

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | Arquivo SQLite, relativo a `server/prisma/` |
| `PORT` | `3001` | Porta da API |
| `PARTNER_A_NAME` | `Ana` | Primeira conta individual |
| `PARTNER_B_NAME` | `Bruno` | Segunda conta individual |
| `JOINT_ACCOUNT_NAME` | `Casal` | Conta conjunta |

### Testes

```bash
npm test --prefix server   # ciclo de fatura, parcelas, recorrência, importação de extrato, health da API
npm test --prefix client   # formatação e utilitários de data
```

## Rodando com Docker

```bash
docker compose up --build -d
```

O app fica em http://localhost:3001. As migrations são aplicadas na inicialização e o banco fica no volume `finapp_data`, então sobrevive a rebuilds (`docker compose down -v` apaga o volume).

Também dá para usar a imagem publicada:

```bash
docker run -d -p 3001:3001 -v finapp_data:/app/server/data ghcr.io/baxelin/finance-app:latest
```

## CI/CD

- **CI** (todo push e pull request): testes do server contra um SQLite temporário, testes e build de produção do client e validação do build Docker.
- **CD** (push na `main` e tags `v*.*.*`): roda o CI de novo, gera a imagem `linux/amd64` + `linux/arm64` e publica no GitHub Container Registry com as tags `latest`, `sha-<commit>` e a versão semver.

---

<div align="center">
Feito por <a href="https://github.com/baxelin">baxelin</a>
</div>
