import { test, expect } from './fixtures/electron'

test('app starts and shows test group', async ({ window }) => {
  const groupLink = window.getByRole('link', {
    name: /playwright-automated-test-fixture/i,
  })
  await expect(groupLink).toBeVisible()
})

test('navigates to MCP Servers from another tab', async ({ window }) => {
  // First navigate away
  await window.getByRole('link', { name: 'Registry' }).click()
  await expect(
    window.getByRole('heading', { name: 'Registry', level: 1 })
  ).toBeVisible()

  // Then navigate back to MCP Servers
  await window.getByRole('link', { name: 'MCP Servers' }).click()
  await expect(
    window.getByRole('link', { name: /playwright-automated-test-fixture/i })
  ).toBeVisible()
})
