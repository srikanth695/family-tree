import { LifeEventService } from './life-events.service';
export declare class LifeEventController {
    private readonly lifeEventService;
    constructor(lifeEventService: LifeEventService);
    create(personId: string, body: Record<string, unknown>, req: any): Promise<{
        id: string;
        created_at: Date;
        type: string;
        title: string;
        description: string | null;
        event_date: Date | null;
        place: string | null;
        person_id: string;
    }>;
    findAllByPerson(personId: string, req: any): Promise<{
        id: string;
        created_at: Date;
        type: string;
        title: string;
        description: string | null;
        event_date: Date | null;
        place: string | null;
        person_id: string;
    }[]>;
    update(id: string, body: Record<string, unknown>, req: any): Promise<{
        id: string;
        created_at: Date;
        type: string;
        title: string;
        description: string | null;
        event_date: Date | null;
        place: string | null;
        person_id: string;
    }>;
    remove(id: string, req: any): Promise<{
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
