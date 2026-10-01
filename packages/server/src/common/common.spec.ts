import { describe, expect, it } from 'vitest';
import { getJwtSecret, getInternalAuthSecret } from './jwt-secret'
import { toPublicUser } from './public-user'
import { pick, canWrite } from './pick'
import { toDateOrUndefined, sanitizePersonInput } from './sanitize'
import { familyNameKey, normalizeFamilyName, personAppearsOnTree, peopleVisibleOnFamilyTree } from './family-name'

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

  it('fails in production when JWT_SECRET is missing', () => {
    const previousEnv = process.env.NODE_ENV
    const previousSecret = process.env.JWT_SECRET
    process.env.NODE_ENV = 'production'
    delete process.env.JWT_SECRET
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET must be set/)
    process.env.NODE_ENV = previousEnv
    process.env.JWT_SECRET = previousSecret
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

describe('family name matching', () => {
  it('treats "Muthyala family tree" as Muthyala', () => {
    expect(normalizeFamilyName('Muthyala family tree')).toBe('Muthyala')
    expect(familyNameKey('Muthyala family tree')).toBe(familyNameKey('Muthyala'))
  })

  it('shows a wife on her married family tree and parental tree', () => {
    const person = {
      tree_id: 'muthyala-tree',
      last_name: 'Balla',
      maiden_name: 'Muthyala',
    }
    expect(personAppearsOnTree(person, 'muthyala-tree', familyNameKey('Muthyala'))).toBe(true)
    expect(personAppearsOnTree(person, 'balla-tree', familyNameKey('Balla'))).toBe(true)
    expect(personAppearsOnTree(person, 'other-tree', familyNameKey('Rivera'))).toBe(false)
  })

  it('includes a married-out daughter\'s husband on her parental tree', () => {
    const wife = {
      id: 'ramya',
      tree_id: 'muthyala-tree',
      last_name: 'Muthyala',
      maiden_name: 'Balla',
    }
    const husband = {
      id: 'husband',
      tree_id: 'muthyala-tree',
      last_name: 'Muthyala',
      maiden_name: null,
    }
    const outsider = {
      id: 'other',
      tree_id: 'muthyala-tree',
      last_name: 'Muthyala',
      maiden_name: null,
    }
    const visible = peopleVisibleOnFamilyTree(
      'balla-tree',
      familyNameKey('Balla'),
      [wife, husband, outsider],
      [{ type: 'spouse', person_a_id: 'husband', person_b_id: 'ramya' }],
    )
    expect(visible.map((p) => p.id).sort()).toEqual(['husband', 'ramya'])
  })
})
