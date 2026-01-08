import { test, expect } from './fixtures/electron'

test('app starts and shows test group', async ({ window }) => {
  await expect(
    window.getByRole('link', { name: /playwright-automated-test-fixture/i })
  ).toBeVisible()
})

test('navigates to MCP Servers from another tab', async ({ window }) => {
  await window.getByRole('link', { name: 'Registry' }).click()
  await expect(
    window.getByRole('heading', { name: 'Registry', level: 1 })
  ).toBeVisible()

  await window.getByRole('link', { name: 'MCP Servers' }).click()
  await expect(
    window.getByRole('link', { name: /playwright-automated-test-fixture/i })
  ).toBeVisible()
})
