import { test, expect } from './fixtures/electron'

test('app starts and stops properly', async ({ window }) => {
  const header = window.getByRole('heading', {
    name: /add your first mcp server/i,
  })
  await header.waitFor()
  await expect(header).toBeVisible()
})

test('install & uninstall server', async ({ window }) => {
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

  await window.getByRole('tab', { name: /network isolation/i }).click()

  await window
    .getByRole('switch', { name: /enable outbound network filtering/i })
    .click()

  await window.getByRole('button', { name: /add a host/i }).click()
  await window.getByRole('textbox', { name: /host 1/i }).fill('wikipedia.org')

  await window.getByRole('button', { name: /add a host/i }).click()
  await window.getByRole('textbox', { name: /host 2/i }).fill('google.com')

  await window.getByRole('textbox', { name: /host 2/i }).fill('google')
  await expect(window.getByText(/invalid host format/i)).toBeVisible()

  await window.getByRole('textbox', { name: /host 2/i }).fill('google.com')
  await expect(window.getByText(/invalid host format/i)).not.toBeVisible()

  await window.getByRole('textbox', { name: /host 2/i }).fill('google')
  await expect(window.getByText(/invalid host format/i)).toBeVisible()

  await window.getByRole('tab', { name: /configuration/i }).click()

  await window
    .getByRole('button', {
      name: /install server/i,
    })
    .click()

  await expect(window.getByText(/invalid host format/i)).toBeVisible()

  await window.getByRole('textbox', { name: /host 2/i }).fill('google.com')
  await expect(window.getByText(/invalid host format/i)).not.toBeVisible()

  await window.getByRole('textbox', { name: /host 2/i }).fill('google')
  await expect(window.getByText(/invalid host format/i)).toBeVisible()

  await window.getByRole('textbox', { name: /host 2/i }).fill('google.com')
  await expect(window.getByText(/invalid.*/i)).not.toBeVisible()

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
