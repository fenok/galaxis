import { QueryProcessor, QueryResult, QueryState, QueryRequestFlags } from './QueryProcessor';
import { MutationProcessor } from './MutationProcessor';
import { RequestQueue } from './RequestQueue';
import { NonUndefined, Cache, BaseQuery, BaseMutation } from '../types';

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

    public subscribe<D extends NonUndefined, E extends Error, R>(
        query: BaseQuery<C, D, E, R>,
        onChange: (state: QueryState<D, E>) => void,
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

    public getQueryState<D extends NonUndefined, E extends Error, R>(query: BaseQuery<C, D, E, R>): QueryState<D, E> {
        return this.queryProcessor.getQueryState(query);
    }

    public query<D extends NonUndefined, E extends Error, R>(
        query: BaseQuery<C, D, E, R>,
        requestFlags?: Partial<QueryRequestFlags>,
    ): QueryResult<D, E> {
        return this.queryProcessor.query(query, requestFlags);
    }

    public async mutate<D extends NonUndefined, E extends Error, R>(mutation: BaseMutation<C, D, E, R>): Promise<D> {
        return this.mutationProcessor.mutate(mutation);
    }

    private areQueryStatesEqual<D extends NonUndefined, E extends Error>(
        a: QueryState<D, E>,
        b: QueryState<D, E>,
    ): boolean {
        // Since we compare states of the same query, that's all we need, as flags are the same if data and error are.
        return a.cache?.error === b.cache?.error && a.cache?.data === b.cache?.data;
    }
}

export { Client, ClientOptions };
