/**
 * Adds a discriminant type tag to a type for use in discriminated unions
 *
 * @example
 * type Item =
 *   | WithTypeTag<'user', User>
 *   | WithTypeTag<'group', Group>
 *
 * // Results in:
 * // { type: 'user' } & User | { type: 'group' } & Group
 */
export type WithTypeTag<Tag extends string, T> = { type: Tag } & T
