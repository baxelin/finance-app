const { test } = require('node:test')
const assert = require('node:assert/strict')
const app = require('../src/app')

test('GET /api/health returns ok', async (t) => {
  const server = app.listen(0)
  t.after(() => server.close())

  const { port } = server.address()
  const res = await fetch(`http://127.0.0.1:${port}/api/health`)
  const body = await res.json()

  assert.equal(res.status, 200)
  assert.deepEqual(body, { status: 'ok' })
})

test('GET /api/unknown-route falls through without crashing', async (t) => {
  const server = app.listen(0)
  t.after(() => server.close())

  const { port } = server.address()
  const res = await fetch(`http://127.0.0.1:${port}/api/does-not-exist`)

  assert.equal(res.status, 404)
})
