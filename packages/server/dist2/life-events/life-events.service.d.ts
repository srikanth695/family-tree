import { AccessService } from '../common/access.service';
export declare class LifeEventService {
    private access;
    constructor(access: AccessService);
    create(personId: string, data: Record<string, unknown>, creatorId: string): Promise<{
        id: string;
        created_at: Date;
        type: string;
        title: string;
        description: string | null;
        event_date: Date | null;
        place: string | null;
        person_id: string;
    }>;
    findAllByPerson(personId: string, userId: string): Promise<{
        id: string;
        created_at: Date;
        type: string;
        title: string;
        description: string | null;
        event_date: Date | null;
        place: string | null;
        person_id: string;
    }[]>;
    update(id: string, data: Record<string, unknown>, userId: string): Promise<{
        id: string;
        created_at: Date;
        type: string;
        title: string;
        description: string | null;
        event_date: Date | null;
        place: string | null;
        person_id: string;
    }>;
    delete(id: string, userId: string): Promise<{
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
