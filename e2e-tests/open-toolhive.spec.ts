import { test, expect } from './fixtures/electron'

test('app starts and stops properly', async ({ window }) => {
  const header = window.getByRole('heading', {
    name: /add your first mcp server/i,
  })
  await header.waitFor()
  expect(header).toBeVisible()
})

test('install fetch', async ({ window }) => {
  await window.getByRole('link', { name: /browse registry/i }).click()
  await window
    .getByRole('button', {
      name: /fetch/i,
    })
    .click()
  await window
    .getByRole('button', {
      name: /install server/i,
    })
    .click()
  await window
    .getByRole('button', {
      name: /install server/i,
    })
    .click()
})
