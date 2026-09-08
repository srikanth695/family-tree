export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: Date;
};

export function toPublicUser(user: {
  id: string;
  email: string;
  name: string | null;
  avatar_url?: string | null;
  role?: string;
  created_at: Date;
  password_hash?: string | null;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url ?? null,
    role: user.role ?? 'user',
    created_at: user.created_at,
  };
}
