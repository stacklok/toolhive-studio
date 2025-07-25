import { test, expect } from './fixtures/electron'

test('app starts and stops properly', async ({ window }) => {
  const header = window.getByRole('heading', {
    name: /add your first mcp server/i,
  })
  await header.waitFor()
  await expect(header).toBeVisible()
})

test('install & uninstall fetch', async ({ window }) => {
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
  await window
    .getByRole('link', {
      name: /view/i,
    })
    .click()
  await window.getByText('Running').waitFor()
  await window
    .getByRole('button', {
      name: /more options/i,
    })
    .click()
  await window
    .getByRole('menuitem', {
      name: /remove/i,
    })
    .click()
  await window
    .getByRole('button', {
      name: /remove/i,
    })
    .click()
  const header = window.getByRole('heading', {
    name: /add your first mcp server/i,
  })
  await header.waitFor()
  await expect(header).toBeVisible()
})
