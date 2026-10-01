export type RelationshipType =
  | 'father-child'
  | 'mother-child'
  | 'parent-child'
  | 'spouse'
  | 'sibling'
  | 'adopted'
  | 'guardian'

export type Gender = 'male' | 'female'
export type RelationshipStatus = 'married' | 'divorced' | 'engaged' | 'widowed'
export type MediaType = 'photo' | 'document' | 'audio' | 'video'
export type LifeEventType = 'education' | 'military' | 'migration' | 'career' | 'religious' | 'other'
export type Confidence = 'confirmed' | 'likely' | 'family_legend'
export type TreeRole = 'owner' | 'editor' | 'viewer'

/** Global account roles */
export type SystemRole = 'admin' | 'family_tree_admin' | 'family_admin' | 'user'

export const SYSTEM_ROLES: SystemRole[] = [
  'admin',
  'family_tree_admin',
  'family_admin',
  'user',
]

export type RoleRight =
  | 'manage_users'
  | 'manage_roles'
  | 'create_family_tree'
  | 'delete_family_tree'
  | 'manage_tree_members'
  | 'edit_family_data'
  | 'view_family_trees'

export type RoleRights = Record<RoleRight, boolean>

export const ROLE_RIGHTS: Record<SystemRole, RoleRights> = {
  admin: {
    manage_users: true,
    manage_roles: true,
    create_family_tree: true,
    delete_family_tree: true,
    manage_tree_members: true,
    edit_family_data: true,
    view_family_trees: true,
  },
  family_tree_admin: {
    manage_users: false,
    manage_roles: false,
    create_family_tree: true,
    delete_family_tree: false,
    manage_tree_members: true,
    edit_family_data: true,
    view_family_trees: true,
  },
  family_admin: {
    manage_users: false,
    manage_roles: false,
    create_family_tree: false,
    delete_family_tree: false,
    manage_tree_members: false,
    edit_family_data: true,
    view_family_trees: true,
  },
  user: {
    manage_users: false,
    manage_roles: false,
    create_family_tree: false,
    delete_family_tree: false,
    manage_tree_members: false,
    edit_family_data: false,
    view_family_trees: true,
  },
}

export const ROLE_LABELS: Record<SystemRole, string> = {
  admin: 'Admin',
  family_tree_admin: 'Family tree admin',
  family_admin: 'Family admin',
  user: 'User',
}

export const ROLE_DESCRIPTIONS: Record<SystemRole, string> = {
  admin: 'Full access: manage users/roles, create and delete trees, and delete people.',
  family_tree_admin: 'Create and manage family trees, invite members, and edit family data. Cannot delete trees or people.',
  family_admin: 'Edit people and relationships in trees they belong to. Cannot create or delete trees.',
  user: 'View family trees they belong to. Cannot create trees or edit family data.',
}

export const ROLE_RIGHT_LABELS: Record<RoleRight, string> = {
  manage_users: 'Manage users',
  manage_roles: 'Manage roles',
  create_family_tree: 'Create family trees',
  delete_family_tree: 'Delete family trees',
  manage_tree_members: 'Manage tree members',
  edit_family_data: 'Edit people and relationships',
  view_family_trees: 'View family trees',
}

export function isSystemRole(role: string | null | undefined): role is SystemRole {
  return SYSTEM_ROLES.includes(role as SystemRole)
}

export function normalizeSystemRole(role: string | null | undefined): SystemRole {
  return isSystemRole(role) ? role : 'user'
}

export function hasRight(role: string | null | undefined, right: RoleRight): boolean {
  const normalized = normalizeSystemRole(role)
  return ROLE_RIGHTS[normalized][right]
}

export function roleLabel(role: string | null | undefined): string {
  const normalized = normalizeSystemRole(role)
  return ROLE_LABELS[normalized]
}

/** person_a is the parent/guardian; person_b is the child */
export const PARENT_CHILD_TYPES: RelationshipType[] = [
  'father-child',
  'mother-child',
  'parent-child',
  'adopted',
  'guardian',
]

export function relationshipLabel(type: string): string {
  switch (type) {
    case 'father-child':
      return 'Father → Child'
    case 'mother-child':
      return 'Mother → Child'
    case 'parent-child':
      return 'Parent → Child'
    case 'spouse':
      return 'Spouse (Husband / Wife)'
    case 'sibling':
      return 'Sibling'
    case 'adopted':
      return 'Adoptive parent → Child'
    case 'guardian':
      return 'Guardian → Child'
    default:
      return type
  }
}
