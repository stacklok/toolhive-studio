import { test, expect } from './fixtures/electron'

test('app starts and shows test group', async ({ window }) => {
  // Verify the test group was created by the fixture
  const groupLink = window.getByRole('link', {
    name: /playwright-automated-test-fixture/i,
  })
  await expect(groupLink).toBeVisible()
})

test('install and uninstall server from registry', async ({ window }) => {
  // Click "Add an MCP server" button to open the dropdown menu
  await window.getByRole('button', { name: /add an mcp server/i }).click()

  // Click "Add from registry" in the dropdown menu
  await window.getByRole('menuitem', { name: /from the registry/i }).click()

  // On the registry page, click on the "everything" server card to navigate to detail page
  await window.getByText('everything').click()

  // On the detail page, click "Install server" button to open the dialog
  await window.getByRole('button', { name: /install server/i }).click()

  // Wait for the dialog to appear
  await window.getByRole('dialog').waitFor()

  // Change the server name to avoid conflicts with existing servers
  const serverNameInput = window.getByLabel('Server name')
  await serverNameInput.fill('e2e-test-server')

  // Select our test group instead of default
  await window.getByRole('combobox', { name: 'Group' }).click()
  await window
    .getByRole('option', { name: 'playwright-automated-test-fixture' })
    .click()

  // Click "Install server" in the dialog to start installation
  await window.getByRole('button', { name: /install server/i }).click()

  // Wait for installation to complete - a success toast appears with a "View" button
  // The View button is a Link inside a Button, so we look for the link text
  const viewButton = window.getByRole('link', { name: /^view$/i })
  await viewButton.waitFor({ timeout: 60000 })
  await viewButton.click()

  // Now we should be on the server view page, verify the server is running
  await window.getByText('Running').waitFor()

  // Open the options menu
  await window.getByRole('button', { name: /more options/i }).click()

  // Click remove
  await window.getByRole('menuitem', { name: /remove/i }).click()

  // Confirm removal
  await window.getByRole('button', { name: /remove/i }).click()

  // Verify we're back to empty state (in our test group)
  const emptyState = window.getByRole('heading', {
    name: /add your first mcp server/i,
  })
  await emptyState.waitFor()
  await expect(emptyState).toBeVisible()
})
