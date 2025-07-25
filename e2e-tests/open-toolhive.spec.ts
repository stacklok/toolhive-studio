import { test, expect } from './fixtures/electron'

test('app starts and stops properly', async ({ window }) => {
  const header = window.getByRole('heading', {
    name: /add your first mcp server/i,
  })
  await header.waitFor()
  expect(header).toBeVisible()
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
  expect(header).toBeVisible()
})

test('network isolation form', async ({ window }) => {
  await window.getByRole('link', { name: /browse registry/i }).click()
  await window
    .getByRole('button', {
      name: /sequentialthinking/i,
    })
    .click()
  await window
    .getByRole('button', {
      name: /install server/i,
    })
    .click()

  // Switch to Network Isolation tab
  await window.getByRole('tab', { name: /network isolation/i }).click()

  // Enable network isolation
  await window
    .getByRole('switch', { name: /enable outbound network filtering/i })
    .click()

  // Add wikipedia.org to allowed hosts
  await window.getByRole('button', { name: /add a host/i }).click()
  await window.getByRole('textbox', { name: /host 1/i }).fill('wikipedia.org')

  // Add google.com to allowed hosts
  await window.getByRole('button', { name: /add a host/i }).click()
  await window.getByRole('textbox', { name: /host 2/i }).fill('google.com')

  // Switch back to Configuration tab to submit
  await window.getByRole('tab', { name: /configuration/i }).click()

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
  expect(header).toBeVisible()
})
