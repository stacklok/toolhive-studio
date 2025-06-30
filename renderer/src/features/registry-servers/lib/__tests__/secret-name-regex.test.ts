import { expect, it } from 'vitest'
import { SECRET_NAME_REGEX } from '../secret-name-regex'

it('returns undefined for no suffix', () => {
  expect('MY_SECRET'.match(SECRET_NAME_REGEX)).toStrictEqual(
    expect.arrayContaining(['MY_SECRET', 'MY_SECRET', undefined])
  )
})

it('handles single digit number suffix', () => {
  expect('MY_SECRET_2'.match(SECRET_NAME_REGEX)).toStrictEqual(
    expect.arrayContaining(['MY_SECRET_2', 'MY_SECRET', '2'])
  )
})

it('handles multiple digits in number suffix', () => {
  expect(
    'MY_SECRET_10'.match(SECRET_NAME_REGEX),
    'should handle multiple digits in number suffix'
  ).toStrictEqual(expect.arrayContaining(['MY_SECRET_10', 'MY_SECRET', '10']))
})

it('does not treat multiple underscored secrets as suffixed', () => {
  expect(
    'MY_SECRET_2_3'.match(SECRET_NAME_REGEX),
    'multiple underscores should not be matched as a number suffix'
  ).toStrictEqual(expect.arrayContaining(['MY_SECRET_2_3', 'MY_SECRET_2', '3']))
})
