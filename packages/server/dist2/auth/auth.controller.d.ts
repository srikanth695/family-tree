import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(body: {
        email?: string;
        password?: string;
        name?: string;
    }): Promise<{
        access_token: string;
        user: import("../common/public-user").PublicUser;
    }>;
    login(body: {
        email?: string;
        password?: string;
    }): Promise<{
        access_token: string;
        user: import("../common/public-user").PublicUser;
    }>;
    oauth(body: {
        email?: string;
        name?: string;
        avatar_url?: string;
    }, secret: string): Promise<{
        access_token: string;
        user: import("../common/public-user").PublicUser;
    }>;
    getProfile(req: any): import("../common/public-user").PublicUser;
}
