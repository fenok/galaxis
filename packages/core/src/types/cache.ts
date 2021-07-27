import { NonUndefined } from './helpers';

export interface UpdateOptions<C extends NonUndefined> {
    data?: (prevData: C) => C;
    errors?: Record<string, (prevError: Error | undefined) => Error | undefined>;
    createSplitFor?: unknown;
    clearSplitFor?: unknown;
}

export interface Cache<C extends NonUndefined> {
    subscribe(callback: () => void): () => void;
    update(opts: UpdateOptions<C>): void;
    getData(): C;
    getError(requestId: string): Error | undefined;
    clear(): void;
}
