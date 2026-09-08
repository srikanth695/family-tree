import { AccessService } from '../common/access.service';
export declare class MediaService {
    private access;
    private readonly uploadDir;
    constructor(access: AccessService);
    private ensureDirectoryExists;
    upload(treeId: string, personId: string | null, userId: string, file?: Express.Multer.File): Promise<{
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
    findAllByTree(treeId: string, userId: string): Promise<{
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
    }[]>;
    delete(id: string, userId: string): Promise<{
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
}
