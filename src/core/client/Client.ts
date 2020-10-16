import { QueryProcessor, QueryResult, QueryState, QueryRequestFlags } from './QueryProcessor';
import { MutationProcessor } from './MutationProcessor';
import { RequestQueue } from './RequestQueue';
import { NonUndefined, Cache, Query, Mutation } from '../types';

interface ClientOptions<C extends NonUndefined = null> {
    cache: Cache<C>;
}

class Client<C extends NonUndefined> {
    private readonly cache: Cache<C>;
    private queryProcessor: QueryProcessor<C>;
    private mutationProcessor: MutationProcessor<C>;

    constructor({ cache }: ClientOptions<C>) {
        const networkRequestQueue = new RequestQueue();
        this.cache = cache;
        this.queryProcessor = new QueryProcessor({ cache, requestQueue: networkRequestQueue });
        this.mutationProcessor = new MutationProcessor({ cache, networkRequestQueue });
    }

    public purge() {
        this.queryProcessor.purge();
        this.mutationProcessor.purge();
        this.cache.purge();
    }

    public subscribe<R extends NonUndefined, E extends Error, I>(
        query: Query<C, R, E, I>,
        onChange: (state: QueryState<R, E>) => void,
    ) {
        if (query.fetchPolicy !== 'no-cache') {
            return this.cache.subscribe(() => {
                onChange(this.getQueryState(query));
            });
        }

        throw new Error("Query with 'no-cache' fetch policy cannot be subscribed to cache");
    }

    public onHydrateComplete() {
        this.queryProcessor.onHydrateComplete();
    }

    public getQueryState<R extends NonUndefined, E extends Error, I>(query: Query<C, R, E, I>): QueryState<R, E> {
        return this.queryProcessor.getQueryState(query);
    }

    public query<R extends NonUndefined, E extends Error, I>(
        query: Query<C, R, E, I>,
        requestFlags?: Partial<QueryRequestFlags>,
    ): QueryResult<R, E> {
        return this.queryProcessor.query(query, requestFlags);
    }

    public async mutate<R extends NonUndefined, E extends Error, I>(mutation: Mutation<C, R, E, I>): Promise<R> {
        return this.mutationProcessor.mutate(mutation);
    }
}

export { Client, ClientOptions };
