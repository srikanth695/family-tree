import { describe, expect, it } from 'vitest';
import { getJwtSecret, getInternalAuthSecret } from './jwt-secret'
import { toPublicUser } from './public-user'
import { pick, canWrite } from './pick'
import { toDateOrUndefined, sanitizePersonInput } from './sanitize'

describe('jwt secret helpers', () => {
  it('uses JWT_SECRET when set', () => {
    const previous = process.env.JWT_SECRET
    process.env.JWT_SECRET = 'abc'
    expect(getJwtSecret()).toBe('abc')
    process.env.JWT_SECRET = previous
  })

  it('uses INTERNAL_AUTH_SECRET when set', () => {
    const previous = process.env.INTERNAL_AUTH_SECRET
    process.env.INTERNAL_AUTH_SECRET = 'internal'
    expect(getInternalAuthSecret()).toBe('internal')
    process.env.INTERNAL_AUTH_SECRET = previous
  })
})

describe('toPublicUser', () => {
  it('strips password_hash', () => {
    const publicUser = toPublicUser({
      id: '1',
      email: 'a@b.c',
      name: 'A',
      avatar_url: null,
      role: 'user',
      created_at: new Date('2020-01-01'),
      password_hash: 'secret',
    })
    expect(publicUser).not.toHaveProperty('password_hash')
    expect(publicUser.email).toBe('a@b.c')
  })
})

describe('pick and roles', () => {
  it('only copies allowed keys', () => {
    expect(pick({ first_name: 'Sam', tree_id: 'x', extra: 1 }, ['first_name'])).toEqual({
      first_name: 'Sam',
    })
  })

  it('treats viewers as read-only', () => {
    expect(canWrite('viewer')).toBe(false)
    expect(canWrite('editor')).toBe(true)
    expect(canWrite('owner')).toBe(true)
  })
})

describe('sanitizePersonInput', () => {
  it('converts HTML date strings to Date', () => {
    const result = sanitizePersonInput({
      first_name: 'Sam',
      gender: '',
      birth_date: '1990-05-01',
    })
    expect(result.first_name).toBe('Sam')
    expect(result.gender).toBeUndefined()
    expect(result.birth_date).toBeInstanceOf(Date)
    expect((result.birth_date as Date).toISOString()).toBe('1990-05-01T00:00:00.000Z')
  })

  it('rejects invalid dates', () => {
    expect(() => toDateOrUndefined('not-a-date')).toThrow('Invalid date')
  })
})
