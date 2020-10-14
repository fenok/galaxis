import { QueryProcessor, QueryResult, QueryState } from './QueryProcessor';
import { MutationProcessor } from './MutationProcessor';
import { RequestQueue } from './RequestQueue';
import { RequesterIdGenerator } from './RequesterIdGenerator';
import { NonUndefined, Cache, Query, Mutation } from '../types';

interface ClientOptions<C extends NonUndefined = null> {
    cache: Cache<C>;
}

class Client<C extends NonUndefined> {
    private readonly requesterIdGenerator: RequesterIdGenerator;
    private readonly cache: Cache<C>;
    private queryProcessor: QueryProcessor<C>;
    private mutationProcessor: MutationProcessor<C>;

    constructor({ cache }: ClientOptions<C>) {
        const networkRequestQueue = new RequestQueue();
        this.requesterIdGenerator = new RequesterIdGenerator();
        this.cache = cache;
        this.queryProcessor = new QueryProcessor({ cache, requestQueue: networkRequestQueue });
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
        request: Query<C, R, E, I>,
        onChange: (state: QueryState<R, E>) => void,
    ) {
        return this.cache.subscribe(() => {
            onChange(this.getState(request));
        });
    }

    public onHydrateComplete() {
        this.queryProcessor.onHydrateComplete();
    }

    public getState<R extends NonUndefined, E extends Error, I>(request: Query<C, R, E, I>): QueryState<R, E> {
        return this.queryProcessor.getQueryState(request);
    }

    public query<R extends NonUndefined, E extends Error, I>(request: Query<C, R, E, I>): QueryResult<R, E> {
        return this.queryProcessor.query(request);
    }

    public async mutate<R extends NonUndefined, E extends Error, I>(request: Mutation<C, R, E, I>): Promise<R> {
        return this.mutationProcessor.mutate(request).then(result => {
            request.refetchQueries?.forEach(requestData => {
                this.queryProcessor.query(requestData);
            });

            return result;
        });
    }
}

export { Client, ClientOptions };
