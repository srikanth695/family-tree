export type PublicUser = {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
    role: string;
    created_at: Date;
};
export declare function toPublicUser(user: {
    id: string;
    email: string;
    name: string | null;
    avatar_url?: string | null;
    role?: string;
    created_at: Date;
    password_hash?: string | null;
}): PublicUser;
