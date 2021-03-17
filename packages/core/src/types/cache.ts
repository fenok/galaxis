import { NonUndefined } from './helpers';

export interface UpdateStateOptions<C extends NonUndefined> {
    data?: C;
    error?: [string, Error | undefined];
}

export interface Cache<C extends NonUndefined> {
    subscribe(callback: () => void): () => void;
    updateState(opts: UpdateStateOptions<C>): void;
    getCacheData(): C;
    getRequestError(requestId: string): Error | undefined;
    purge(): void;
}
