import { QueryProcessor, QueryState, QueryResult } from './QueryProcessor';
import { MutationProcessor } from './MutationProcessor';
import { RequestQueue } from './RequestQueue';
import { BaseMutation, BaseQuery, BaseRequest, Cache, NonUndefined } from '../types';

interface Merge {
    <R1, R2, R3, R4, R5>(r1: R1, r2: R2, r3: R3, r4: R4, r5: R5): R1 & R2 & R3 & R4 & R5;
}

interface ClientOptions<
    C extends NonUndefined = NonUndefined,
    CACHE extends Cache<C> = Cache<C>,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR = unknown
> {
    cache: CACHE;
    merge: Merge;
    hash(value: unknown): string;
    defaultRequest?: Partial<BaseRequest<C, BD, BE, BR>>;
    defaultQuery?: Partial<BaseQuery<C, BD, BE, BR>>;
    defaultMutation?: Partial<BaseMutation<C, BD, BE, BR>>;
}

class Client<
    C extends NonUndefined = NonUndefined,
    CACHE extends Cache<C> = Cache<C>,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR = unknown
> {
    private readonly cache: CACHE;
    private queryProcessor: QueryProcessor<C>;
    private mutationProcessor: MutationProcessor<C>;
    private merge: Merge;
    private hash: (value: unknown) => string;
    private staticDefaultRequest?: Partial<BaseRequest<C, BD, BE, BR>>;
    private staticDefaultQuery?: Partial<BaseQuery<C, BD, BE, BR>>;
    private staticDefaultMutation?: Partial<BaseMutation<C, BD, BE, BR>>;
    private dynamicDefaultRequest?: Partial<BaseRequest<C, BD, BE, BR>>;
    private dynamicDefaultQuery?: Partial<BaseQuery<C, BD, BE, BR>>;
    private dynamicDefaultMutation?: Partial<BaseMutation<C, BD, BE, BR>>;

    constructor({
        cache,
        merge,
        defaultRequest,
        defaultQuery,
        defaultMutation,
        hash,
    }: ClientOptions<C, CACHE, BD, BE, BR>) {
        const requestQueue = new RequestQueue();
        this.cache = cache;
        this.queryProcessor = new QueryProcessor({ cache, requestQueue, hash });
        this.mutationProcessor = new MutationProcessor({ cache, requestQueue, hash });
        this.merge = merge;
        this.hash = hash;
        this.staticDefaultRequest = defaultRequest;
        this.staticDefaultQuery = defaultQuery;
        this.staticDefaultMutation = defaultMutation;
    }

    public query<D extends BD, E extends BE, R extends BR>(
        query: BaseQuery<C, D, E, R>,
        onChange?: (state: QueryState<D, E>) => void,
    ): QueryResult<D, E> {
        return this.queryProcessor.query(this.getMergedQuery(query), onChange);
    }

    public fetchQuery<D extends BD, E extends BE, R extends BR>(query: BaseQuery<C, D, E, R>): Promise<D> {
        return this.queryProcessor.fetchQuery(this.getMergedQuery(query));
    }

    public readQuery<D extends BD, E extends BE, R extends BR>(
        query: BaseQuery<C, D, E, R>,
        onChange?: (state: QueryState<D, E>) => void,
    ): QueryState<D, E> {
        return this.queryProcessor.readQuery(this.getMergedQuery(query), onChange);
    }

    public mutate<D extends BD, E extends BE, R extends BR>(mutation: BaseMutation<C, D, E, R>): Promise<D> {
        return this.mutationProcessor.mutate(this.getMergedMutation(mutation));
    }

    public purge() {
        this.dynamicDefaultRequest = undefined;
        this.dynamicDefaultQuery = undefined;
        this.dynamicDefaultMutation = undefined;
        this.queryProcessor.purge();
        this.mutationProcessor.purge();
        this.cache.purge();
    }

    public getCache() {
        return this.cache;
    }

    public onHydrateComplete() {
        this.queryProcessor.onHydrateComplete();
    }

    public setDynamicDefaultRequest(defaultRequest: Partial<BaseRequest<C, BD, BE, BR>>) {
        this.dynamicDefaultRequest = defaultRequest;
    }

    public setDynamicDefaultQuery(defaultQuery: Partial<BaseQuery<C, BD, BE, BR>>) {
        this.dynamicDefaultQuery = defaultQuery;
    }

    public setDynamicDefaultMutation(defaultMutation: Partial<BaseMutation<C, BD, BE, BR>>) {
        this.dynamicDefaultMutation = defaultMutation;
    }

    public getQueryHash<D extends BD, E extends BE, R extends BR>(query: BaseQuery<C, D, E, R>) {
        return this.hash(this.getMergedQuery(query));
    }

    public getMutationHash<D extends BD, E extends BE, R extends BR>(mutation: BaseMutation<C, D, E, R>) {
        return this.hash(this.getMergedMutation(mutation));
    }

    private getMergedQuery<D extends BD, E extends BE, R extends BR>(
        query: BaseQuery<C, D, E, R>,
    ): BaseQuery<C, D, E, R> {
        return this.merge(
            this.staticDefaultRequest,
            this.staticDefaultQuery,
            this.dynamicDefaultRequest,
            this.dynamicDefaultQuery,
            query,
        );
    }

    private getMergedMutation<D extends BD, E extends BE, R extends BR>(
        mutation: BaseMutation<C, D, E, R>,
    ): BaseMutation<C, D, E, R> {
        return this.merge(
            this.staticDefaultRequest,
            this.staticDefaultMutation,
            this.dynamicDefaultRequest,
            this.dynamicDefaultMutation,
            mutation,
        );
    }
}

export { Client, ClientOptions };
