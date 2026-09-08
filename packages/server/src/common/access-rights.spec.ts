import { describe, expect, it } from 'vitest'
import { hasRight, normalizeSystemRole } from '@family-tree/types'
import { canWrite } from './pick'

describe('access rights', () => {
  it('normalizes unknown roles to user', () => {
    expect(normalizeSystemRole('nope')).toBe('user')
    expect(normalizeSystemRole('admin')).toBe('admin')
  })

  it('admin can manage roles and create trees', () => {
    expect(hasRight('admin', 'manage_roles')).toBe(true)
    expect(hasRight('admin', 'create_family_tree')).toBe(true)
  })

  it('family_admin can edit data but not create trees', () => {
    expect(hasRight('family_admin', 'edit_family_data')).toBe(true)
    expect(hasRight('family_admin', 'create_family_tree')).toBe(false)
  })

  it('user cannot edit family data', () => {
    expect(hasRight('user', 'edit_family_data')).toBe(false)
    expect(hasRight('user', 'view_family_trees')).toBe(true)
  })

  it('tree membership write roles', () => {
    expect(canWrite('owner')).toBe(true)
    expect(canWrite('editor')).toBe(true)
    expect(canWrite('viewer')).toBe(false)
  })
})
