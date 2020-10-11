import { QueryProcessor, QueryResult } from './QueryProcessor';
import { MutationProcessor } from './MutationProcessor';
import { NetworkRequestQueue } from './NetworkRequestQueue';
import { RequesterIdGenerator } from './RequesterIdGenerator';
import { NonUndefined, Cache, QueryInit, MutationInit } from '../types';

interface ClientOptions<C extends NonUndefined = null> {
    cache: Cache<C>;
}

interface RequestState<D extends NonUndefined = null, E extends Error = Error> {
    loading: string[];
    error?: E | Error; // Regular error can always slip through
    data?: D;
}

class Client<C extends NonUndefined> {
    private readonly requesterIdGenerator: RequesterIdGenerator;
    private readonly cache: Cache<C>;
    private queryProcessor: QueryProcessor<C>;
    private mutationProcessor: MutationProcessor<C>;

    constructor({ cache }: ClientOptions<C>) {
        const networkRequestQueue = new NetworkRequestQueue();
        this.requesterIdGenerator = new RequesterIdGenerator();
        this.cache = cache;
        this.queryProcessor = new QueryProcessor({ cache, networkRequestQueue });
        this.mutationProcessor = new MutationProcessor({ cache, networkRequestQueue });
    }

    public generateRequesterId(): string {
        return this.requesterIdGenerator.generateId();
    }

    public resetRequesterIdGenerator() {
        this.requesterIdGenerator.reset();
    }

    public purge() {
        this.queryProcessor.purge();
        this.mutationProcessor.purge();
        this.cache.purge();
    }

    public subscribe<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
        onChange: (state: RequestState<R, E>) => void,
    ) {
        return this.cache.subscribe(() => {
            onChange(this.getState(request));
        });
    }

    public enableDataRefetch() {
        this.queryProcessor.enableDataRefetch();
    }

    public getState<R extends NonUndefined, E extends Error, I>(request: QueryInit<C, R, E, I>): RequestState<R, E> {
        return this.queryProcessor.getCompleteRequestState(request);
    }

    public query<R extends NonUndefined, E extends Error, I>(request: QueryInit<C, R, E, I>): QueryResult<R, E> {
        return this.queryProcessor.query(request);
    }

    public async mutate<R extends NonUndefined, E extends Error, I>(request: MutationInit<C, R, E, I>): Promise<R> {
        return this.mutationProcessor.mutate(request).then(result => {
            request.refetchQueries?.forEach(requestData => {
                this.queryProcessor.query(requestData);
            });

            return result;
        });
    }
}

export { Client, ClientOptions, RequestState };
