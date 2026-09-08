import { TreesService } from './trees.service';
export declare class TreesController {
    private readonly treesService;
    constructor(treesService: TreesService);
    create(body: {
        name?: string;
    }, req: any): Promise<{
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
    findMine(req: any): Promise<({
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
    findOne(id: string, req: any): Promise<{
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
    addMember(id: string, body: {
        email?: string;
        role?: string;
    }, req: any): Promise<{
        id: string;
        role: string;
        tree_id: string;
        user_id: string;
        invited_at: Date | null;
    }>;
}
