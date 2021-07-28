import { NonUndefined } from './helpers';

export interface UpdateOptions<TCacheData extends NonUndefined> {
    data?: (prevData: TCacheData) => TCacheData;
    errors?: Record<string, (prevError: Error | undefined) => Error | undefined>;
    createSplitFor?: unknown;
    clearSplitFor?: unknown;
}

export interface Cache<TCacheData extends NonUndefined> {
    subscribe(callback: () => void): () => void;
    update(opts: UpdateOptions<TCacheData>): void;
    getData(): TCacheData;
    getError(requestId: string): Error | undefined;
    clear(): void;
}
