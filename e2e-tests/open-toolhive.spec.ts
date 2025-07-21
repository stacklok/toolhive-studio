import { test, expect } from './fixtures/electron'

test('app starts and stops properly', async ({ window }) => {
  const header = window.getByRole('heading', {
    name: /add your first mcp server/i,
  })
  await header.waitFor()
  expect(header).toBeVisible()
})
