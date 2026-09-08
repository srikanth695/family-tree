export declare class AccessService {
    requireMembership(treeId: string, userId: string): Promise<{
        tree: {
            members: {
                id: string;
                role: string;
                tree_id: string;
                user_id: string;
                invited_at: Date | null;
            }[];
        } & {
            name: string;
            id: string;
            created_at: Date;
            owner_id: string;
        };
        role: string;
    }>;
    requireWriteAccess(treeId: string, userId: string): Promise<{
        tree: {
            members: {
                id: string;
                role: string;
                tree_id: string;
                user_id: string;
                invited_at: Date | null;
            }[];
        } & {
            name: string;
            id: string;
            created_at: Date;
            owner_id: string;
        };
        role: string;
    }>;
    requirePersonAccess(personId: string, userId: string, write?: boolean): Promise<{
        id: string;
        created_at: Date;
        first_name: string;
        last_name: string | null;
        maiden_name: string | null;
        nicknames: string[];
        gender: string | null;
        birth_date: Date | null;
        birth_date_precision: string | null;
        birth_place: string | null;
        death_date: Date | null;
        death_date_precision: string | null;
        death_place: string | null;
        is_living: boolean;
        bio: string | null;
        occupation: string | null;
        religion: string | null;
        nationality: string | null;
        languages: string[];
        cause_of_death: string | null;
        burial_place: string | null;
        tree_id: string;
        created_by: string | null;
        updated_at: Date;
    }>;
    requireRelationshipAccess(relationshipId: string, userId: string, write?: boolean): Promise<{
        id: string;
        created_at: Date;
        person_a_id: string;
        person_b_id: string;
        type: string;
        start_date: Date | null;
        end_date: Date | null;
        status: string | null;
        tree_id: string;
    }>;
    requireMediaAccess(mediaId: string, userId: string, write?: boolean): Promise<{
        id: string;
        created_at: Date;
        type: string;
        tree_id: string;
        person_id: string | null;
        uploaded_by: string;
        file_url: string;
        thumbnail_url: string | null;
        caption: string | null;
        taken_date: Date | null;
    }>;
    requireLifeEventAccess(eventId: string, userId: string, write?: boolean): Promise<{
        person: {
            id: string;
            created_at: Date;
            first_name: string;
            last_name: string | null;
            maiden_name: string | null;
            nicknames: string[];
            gender: string | null;
            birth_date: Date | null;
            birth_date_precision: string | null;
            birth_place: string | null;
            death_date: Date | null;
            death_date_precision: string | null;
            death_place: string | null;
            is_living: boolean;
            bio: string | null;
            occupation: string | null;
            religion: string | null;
            nationality: string | null;
            languages: string[];
            cause_of_death: string | null;
            burial_place: string | null;
            tree_id: string;
            created_by: string | null;
            updated_at: Date;
        };
    } & {
        id: string;
        created_at: Date;
        type: string;
        title: string;
        description: string | null;
        event_date: Date | null;
        place: string | null;
        person_id: string;
    }>;
}
