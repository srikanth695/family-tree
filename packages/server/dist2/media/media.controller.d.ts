import { MediaService } from './media.service';
export declare class MediaController {
    private readonly mediaService;
    constructor(mediaService: MediaService);
    upload(treeId: string, personId: string | undefined, file: Express.Multer.File, req: any): Promise<{
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
    findAllByTree(treeId: string, req: any): Promise<{
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
    remove(id: string, req: any): Promise<{
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
