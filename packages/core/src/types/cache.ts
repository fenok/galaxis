import { NonUndefined } from './helpers';

export interface UpdateOptions<C extends NonUndefined> {
    data?: C;
    error?: [string, Error | undefined];
}

export interface Cache<C extends NonUndefined> {
    subscribe(callback: () => void): () => void;
    update(opts: UpdateOptions<C>): void;
    getData(): C;
    getError(requestId: string): Error | undefined;
    purge(): void;
}
