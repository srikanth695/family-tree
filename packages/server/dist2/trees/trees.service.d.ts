import { AccessService } from '../common/access.service';
export declare class TreesService {
    private access;
    constructor(access: AccessService);
    create(userId: string, name: string): Promise<{
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
    }>;
    findMine(userId: string): Promise<({
        members: {
            id: string;
            role: string;
            tree_id: string;
            user_id: string;
            invited_at: Date | null;
        }[];
        _count: {
            people: number;
        };
    } & {
        name: string;
        id: string;
        created_at: Date;
        owner_id: string;
    })[]>;
    findOne(treeId: string, userId: string): Promise<{
        my_role: string;
        members: {
            id: string;
            role: string;
            tree_id: string;
            user_id: string;
            invited_at: Date | null;
        }[];
        name: string;
        id: string;
        created_at: Date;
        owner_id: string;
    }>;
    addMember(treeId: string, actorId: string, email: string, role: string): Promise<{
        id: string;
        role: string;
        tree_id: string;
        user_id: string;
        invited_at: Date | null;
    }>;
}
