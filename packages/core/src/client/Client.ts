import { QueryProcessor, QueryResult, QueryState, QueryRequestFlags } from './QueryProcessor';
import { MutationProcessor } from './MutationProcessor';
import { RequestQueue } from './RequestQueue';
import { NonUndefined, Cache, Query, Mutation } from '../types';

interface ClientOptions<C extends NonUndefined, CACHE extends Cache<C> = Cache<C>> {
    cache: CACHE;
}

class Client<C extends NonUndefined, CACHE extends Cache<C> = Cache<C>> {
    private readonly cache: CACHE;
    private queryProcessor: QueryProcessor<C>;
    private mutationProcessor: MutationProcessor<C>;

    constructor({ cache }: ClientOptions<C, CACHE>) {
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

    public getCache() {
        return this.cache;
    }

    public subscribe<R extends NonUndefined, E extends Error, I>(
        query: Query<C, R, E, I>,
        onChange: (state: QueryState<R, E>) => void,
    ) {
        if (query.fetchPolicy !== 'no-cache') {
            let currentState = this.getQueryState(query);

            return {
                queryState: currentState,
                unsubscribe: this.cache.subscribe(() => {
                    const newState = this.getQueryState(query);

                    if (!this.areQueryStatesEqual(currentState, newState)) {
                        currentState = newState;
                        onChange(newState);
                    }
                }),
            };
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

    private areQueryStatesEqual<R extends NonUndefined, E extends Error>(
        a: QueryState<R, E>,
        b: QueryState<R, E>,
    ): boolean {
        // Since we compare states of the same query, that's all we need, as flags are the same if data and error are.
        return a.cache?.error === b.cache?.error && a.cache?.data === b.cache?.data;
    }
}

export { Client, ClientOptions };
