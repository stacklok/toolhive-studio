import { prepareSecretsWithoutNamingCollision } from '../prepare-secrets-without-naming-collision'

import { test, expect } from 'vitest'

test('should use original names when no collisions exist', () => {
  expect(
    prepareSecretsWithoutNamingCollision(
      [
        {
          name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
          value: { secret: 'foo-bar', isFromStore: false },
        },
        {
          name: 'JIRA_API_KEY',
          value: { secret: 'foo-bar', isFromStore: false },
        },
      ],
      {
        keys: [{ key: 'GRAFANA_API_KEY' }, { key: 'CONFLUENCE_API_KEY' }],
      }
    )
  ).toEqual([
    {
      secretStoreKey: 'GITHUB_PERSONAL_ACCESS_TOKEN',
      target: 'GITHUB_PERSONAL_ACCESS_TOKEN',
      value: 'foo-bar',
    },
    {
      secretStoreKey: 'JIRA_API_KEY',
      target: 'JIRA_API_KEY',
      value: 'foo-bar',
    },
  ])
})

test('should append number suffix on collision', () => {
  expect(
    prepareSecretsWithoutNamingCollision(
      [
        {
          name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
          value: { secret: 'foo-bar', isFromStore: false },
        },
        {
          name: 'JIRA_API_KEY',
          value: { secret: 'foo-bar', isFromStore: false },
        },
      ],
      {
        keys: [
          { key: 'GITHUB_PERSONAL_ACCESS_TOKEN' },
          { key: 'JIRA_API_KEY' },
        ],
      }
    )
  ).toEqual([
    {
      secretStoreKey: 'GITHUB_PERSONAL_ACCESS_TOKEN_2',
      target: 'GITHUB_PERSONAL_ACCESS_TOKEN',
      value: 'foo-bar',
    },
    {
      secretStoreKey: 'JIRA_API_KEY_2',
      target: 'JIRA_API_KEY',
      value: 'foo-bar',
    },
  ])
})

test('should increment number suffix when collision exists with numbered secret', () => {
  expect(
    prepareSecretsWithoutNamingCollision(
      [
        {
          name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
          value: { secret: 'foo-bar', isFromStore: false },
        },
        {
          name: 'JIRA_API_KEY',
          value: { secret: 'foo-bar', isFromStore: false },
        },
      ],
      {
        keys: [
          { key: 'GITHUB_PERSONAL_ACCESS_TOKEN' },
          { key: 'GITHUB_PERSONAL_ACCESS_TOKEN_2' },
          { key: 'JIRA_API_KEY' },
          { key: 'JIRA_API_KEY_2' },
        ],
      }
    )
  ).toEqual([
    {
      secretStoreKey: 'GITHUB_PERSONAL_ACCESS_TOKEN_3',
      target: 'GITHUB_PERSONAL_ACCESS_TOKEN',
      value: 'foo-bar',
    },
    {
      secretStoreKey: 'JIRA_API_KEY_3',
      target: 'JIRA_API_KEY',
      value: 'foo-bar',
    },
  ])
})

test('should throw when secret from store is passed', () => {
  expect(() =>
    prepareSecretsWithoutNamingCollision(
      [
        {
          name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
          value: { secret: 'foo-bar', isFromStore: true },
        },
        {
          name: 'JIRA_API_KEY',
          value: { secret: 'foo-bar', isFromStore: false },
        },
      ],
      {
        keys: [
          { key: 'GITHUB_PERSONAL_ACCESS_TOKEN' },
          { key: 'GITHUB_PERSONAL_ACCESS_TOKEN_2' },
          { key: 'JIRA_API_KEY' },
          { key: 'JIRA_API_KEY_2' },
        ],
      }
    )
  ).toThrow()
})
