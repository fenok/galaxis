export interface FetchRequestInit extends RequestInit {
    root: string;
    path: string;
    pathParams?: Record<string, string>;
    queryParams?: Record<string, string>;
}
