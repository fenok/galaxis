import { QueryProcessor, QueryResult, QueryState, QueryRequestFlags } from './QueryProcessor';
import { MutationProcessor } from './MutationProcessor';
import { RequestQueue } from './RequestQueue';
import { NonUndefined, Cache, BaseQuery, BaseMutation } from '../types';

interface ClientOptions<
    C extends NonUndefined,
    CACHE extends Cache<C> = Cache<C>,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR = unknown
> {
    cache: CACHE;
    merge<R1, R2, R3>(r1: R1, r2: R2, r3: R3): R1 & R2 & R3;
    hash(value: unknown): string;
    defaultQuery?: Partial<BaseQuery<C, BD, BE, BR>>;
    defaultMutation?: Partial<BaseMutation<C, BD, BE, BR>>;
}

class Client<
    C extends NonUndefined,
    CACHE extends Cache<C> = Cache<C>,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR = unknown
> {
    private readonly cache: CACHE;
    private queryProcessor: QueryProcessor<C>;
    private mutationProcessor: MutationProcessor<C>;
    private merge: <R1, R2, R3>(r1: R1, r2: R2, r3: R3) => R1 & R2 & R3;
    private hash: (value: unknown) => string;
    private staticDefaultQuery?: Partial<BaseQuery<C, BD, BE, BR>>;
    private staticDefaultMutation?: Partial<BaseMutation<C, BD, BE, BR>>;
    private dynamicDefaultQuery?: Partial<BaseQuery<C, BD, BE, BR>>;
    private dynamicDefaultMutation?: Partial<BaseMutation<C, BD, BE, BR>>;

    constructor({ cache, merge, defaultQuery, defaultMutation, hash }: ClientOptions<C, CACHE, BD, BE, BR>) {
        const requestQueue = new RequestQueue();
        this.cache = cache;
        this.queryProcessor = new QueryProcessor({ cache, requestQueue, hash });
        this.mutationProcessor = new MutationProcessor({ cache, requestQueue, hash });
        this.merge = merge;
        this.hash = hash;
        this.staticDefaultQuery = defaultQuery;
        this.staticDefaultMutation = defaultMutation;
    }

    public getHash(value: unknown) {
        return this.hash(value);
    }

    public getDynamicDefaultQueryHash() {
        return this.hash(this.dynamicDefaultQuery);
    }

    public getDynamicDefaultMutationHash() {
        return this.hash(this.dynamicDefaultMutation);
    }

    public setDynamicDefaultQuery(defaultQuery: Partial<BaseQuery<C, BD, BE, BR>>) {
        this.dynamicDefaultQuery = defaultQuery;
    }

    public setDynamicDefaultMutation(defaultMutation: Partial<BaseMutation<C, BD, BE, BR>>) {
        this.dynamicDefaultMutation = defaultMutation;
    }

    public purge() {
        this.dynamicDefaultQuery = undefined;
        this.dynamicDefaultMutation = undefined;
        this.queryProcessor.purge();
        this.mutationProcessor.purge();
        this.cache.purge();
    }

    public getCache() {
        return this.cache;
    }

    public subscribe<D extends BD, E extends BE, R extends BR>(
        query: BaseQuery<C, D, E, R>,
        onChange: (state: QueryState<D, E>) => void,
    ) {
        let currentState = this.getQueryState(query);

        if (currentState.cache) {
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

        throw new Error("Couldn't subscribe to cache, most likely due to 'no-cache' fetch policy");
    }

    public onHydrateComplete() {
        this.queryProcessor.onHydrateComplete();
    }

    public getQueryState<D extends BD, E extends BE, R extends BR>(query: BaseQuery<C, D, E, R>): QueryState<D, E> {
        return this.queryProcessor.getQueryState(this.getMergedQuery(query));
    }

    public query<D extends BD, E extends BE, R extends BR>(
        query: BaseQuery<C, D, E, R>,
        requestFlags?: Partial<QueryRequestFlags>,
    ): QueryResult<D, E> {
        return this.queryProcessor.query(this.getMergedQuery(query), requestFlags);
    }

    public async mutate<D extends BD, E extends BE, R extends BR>(mutation: BaseMutation<C, D, E, R>): Promise<D> {
        return this.mutationProcessor.mutate(this.getMergedMutation(mutation));
    }

    private areQueryStatesEqual<D extends NonUndefined, E extends Error>(
        a: QueryState<D, E>,
        b: QueryState<D, E>,
    ): boolean {
        // Since we compare states of the same query, that's all we need, as flags are the same if data and error are.
        return a.cache?.error === b.cache?.error && a.cache?.data === b.cache?.data;
    }

    private getMergedQuery<D extends BD, E extends BE, R extends BR>(
        query: BaseQuery<C, D, E, R>,
    ): BaseQuery<C, D, E, R> {
        return this.merge(this.staticDefaultQuery, this.dynamicDefaultQuery, query);
    }

    private getMergedMutation<D extends BD, E extends BE, R extends BR>(
        mutation: BaseMutation<C, D, E, R>,
    ): BaseMutation<C, D, E, R> {
        return this.merge(this.staticDefaultMutation, this.dynamicDefaultMutation, mutation);
    }
}

export { Client, ClientOptions };
