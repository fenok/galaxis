import { QueryProcessor, QueryResult, QueryState, QueryRequestFlags } from './QueryProcessor';
import { MutationProcessor } from './MutationProcessor';
import { RequestQueue } from './RequestQueue';
import {
    NonUndefined,
    Cache,
    InternalQuery,
    InternalMutation,
    BaseQuery,
    BaseMutation,
    DefaultQuery,
    DefaultMutation,
} from '../types';

interface ClientOptions<
    C extends NonUndefined,
    CACHE extends Cache<C> = Cache<C>,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR = unknown
> {
    cache: CACHE;
    merge<R1, R2>(r1: R1, r2: R2): R1 & R2;
    hash(value: unknown): string | number;
    defaultQuery?: DefaultQuery<C, BD, BE, BR>;
    defaultMutation?: DefaultMutation<C, BD, BE, BR>;
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
    private merge: <R1, R2>(r1: R1, r2: R2) => R1 & R2;
    private hash: (value: unknown) => string | number;
    private staticDefaultQuery?: DefaultQuery<C, BD, BE, BR>;
    private staticDefaultMutation?: DefaultMutation<C, BD, BE, BR>;
    private dynamicDefaultQuery?: DefaultQuery<C, BD, BE, BR>;
    private dynamicDefaultMutation?: DefaultMutation<C, BD, BE, BR>;

    constructor({ cache, merge, defaultQuery, defaultMutation, hash }: ClientOptions<C, CACHE, BD, BE, BR>) {
        const networkRequestQueue = new RequestQueue();
        this.cache = cache;
        this.queryProcessor = new QueryProcessor({ cache, requestQueue: networkRequestQueue });
        this.mutationProcessor = new MutationProcessor({ cache, networkRequestQueue });
        this.merge = merge;
        this.hash = hash;
        this.staticDefaultQuery = defaultQuery;
        this.staticDefaultMutation = defaultMutation;
    }

    public getHash(value: unknown) {
        return this.hash(value);
    }

    public getDefaultQueryHash() {
        return this.hash(this.getDefaultQuery());
    }

    public getDefaultMutationHash() {
        return this.hash(this.getDefaultMutation());
    }

    public setDefaultQuery(defaultQuery: DefaultQuery<C, BD, BE, BR>) {
        this.dynamicDefaultQuery = defaultQuery;
    }

    public setDefaultMutation(defaultMutation: DefaultMutation<C, BD, BE, BR>) {
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
        const internalQuery = this.getInternalQuery(query);

        if (internalQuery.fetchPolicy !== 'no-cache') {
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

    public getQueryState<D extends BD, E extends BE, R extends BR>(query: BaseQuery<C, D, E, R>): QueryState<D, E> {
        return this.queryProcessor.getQueryState(this.getInternalQuery(query));
    }

    public query<D extends BD, E extends BE, R extends BR>(
        query: BaseQuery<C, D, E, R>,
        requestFlags?: Partial<QueryRequestFlags>,
    ): QueryResult<D, E> {
        return this.queryProcessor.query(this.getInternalQuery(query), requestFlags);
    }

    public async mutate<D extends BD, E extends BE, R extends BR>(mutation: BaseMutation<C, D, E, R>): Promise<D> {
        return this.mutationProcessor.mutate(this.getInternalMutation(mutation));
    }

    private areQueryStatesEqual<D extends NonUndefined, E extends Error>(
        a: QueryState<D, E>,
        b: QueryState<D, E>,
    ): boolean {
        // Since we compare states of the same query, that's all we need, as flags are the same if data and error are.
        return a.cache?.error === b.cache?.error && a.cache?.data === b.cache?.data;
    }

    private getInternalQuery<D extends BD, E extends BE, R extends BR>(
        query: BaseQuery<C, D, E, R>,
    ): InternalQuery<C, D, E, R> {
        return this.merge(this.getDefaultQuery(), query);
    }

    private getInternalMutation<D extends BD, E extends BE, R extends BR>(
        mutation: BaseMutation<C, D, E, R>,
    ): InternalMutation<C, D, E, R> {
        return this.merge(this.getDefaultMutation(), mutation);
    }

    private getDefaultQuery() {
        const defaultQuery = this.dynamicDefaultQuery || this.staticDefaultQuery;

        if (!defaultQuery) {
            throw new Error('No default query');
        }

        return defaultQuery;
    }

    private getDefaultMutation() {
        const defaultMutation = this.dynamicDefaultMutation || this.staticDefaultMutation;

        if (!defaultMutation) {
            throw new Error('No default mutation');
        }

        return defaultMutation;
    }
}

export { Client, ClientOptions };
