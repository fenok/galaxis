export interface CacheUser {
    id: number;
    name: string;
    username: string;
}

export interface CacheEmail {
    id: number;
    email: string;
}

export interface CacheData {
    users: Record<string, CacheUser | undefined>;
    emails: Record<string, CacheEmail | undefined>;
}
