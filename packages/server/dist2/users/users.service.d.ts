import { User } from '@family-tree/database';
import { PublicUser } from '../common/public-user';
export declare class UsersService {
    findOneByEmail(email: string): Promise<User | null>;
    findOneById(id: string): Promise<User | null>;
    create(data: {
        email?: string;
        password?: string;
        name?: string;
    }): Promise<PublicUser>;
}
