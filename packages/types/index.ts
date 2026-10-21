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

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  'father-child',
  'mother-child',
  'parent-child',
  'spouse',
  'sibling',
  'adopted',
  'guardian',
]

/** Person as returned by the API (dates are ISO strings). */
export interface Person {
  id: string
  tree_id: string
  first_name: string
  last_name?: string | null
  maiden_name?: string | null
  nicknames?: string[]
  gender?: Gender | null
  birth_date?: string | null
  birth_date_precision?: string | null
  birth_place?: string | null
  death_date?: string | null
  death_date_precision?: string | null
  death_place?: string | null
  is_living?: boolean
  bio?: string | null
  occupation?: string | null
  religion?: string | null
  nationality?: string | null
  languages?: string[]
  cause_of_death?: string | null
  burial_place?: string | null
  profile_media_id?: string | null
  created_at?: string
  updated_at?: string
}

/** Edge between two people; for parent-type edges person_a is the parent. */
export interface Relationship {
  id: string
  tree_id: string
  person_a_id: string
  person_b_id: string
  type: RelationshipType
  start_date?: string | null
  end_date?: string | null
  status?: RelationshipStatus | null
}

export interface TreePoint {
  x: number
  y: number
}

/** Saved canvas arrangement, shared by everyone on the tree. */
export interface TreeLayout {
  structureKey: string
  positions: Record<string, TreePoint>
}

/** "Sharma family tree" from a stored name such as "Sharma" or "Sharma family tree". */
export function familyTreeTitle(tree?: {
  name?: string | null
  display_name?: string | null
  family_name?: string | null
} | null): string {
  if (tree?.display_name) return tree.display_name
  const base = (tree?.family_name || tree?.name || '').trim().replace(/\s+family\s+tree$/i, '')
  return base ? `${base} family tree` : 'Family tree'
}
