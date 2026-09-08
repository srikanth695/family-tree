import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PublicUser } from '../common/public-user';
export declare class AuthService {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(email: string, pass: string): Promise<PublicUser | null>;
    login(user: PublicUser): Promise<{
        access_token: string;
        user: PublicUser;
    }>;
    register(data: {
        email?: string;
        password?: string;
        name?: string;
    }): Promise<{
        access_token: string;
        user: PublicUser;
    }>;
    oauthUpsert(data: {
        email?: string;
        name?: string;
        avatar_url?: string;
    }): Promise<{
        access_token: string;
        user: PublicUser;
    }>;
}
