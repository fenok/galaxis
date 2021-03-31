import { QueryProcessor, QueryResult, QueryState } from './QueryProcessor';
import { MutationProcessor } from './MutationProcessor';
import { RequestQueue } from './RequestQueue';
import { Mutation, Query, BaseRequest, Cache, NonUndefined } from '../types';
import { QueryManager, QueryManagerResult } from './QueryManager';
import { SsrPromisesManager } from './SsrPromisesManager';
import { MutationManager, MutationManagerResult } from './MutationManager';

interface Merge {
    <R1, R2, R3>(r1: R1, r2: R2, r3: R3): R1 & R2 & R3;
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
    defaultQuery?: Partial<Query<C, BD, BE, BR>>;
    defaultMutation?: Partial<Mutation<C, BD, BE, BR>>;
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
    private defaultRequest?: Partial<BaseRequest<C, BD, BE, BR>>;
    private defaultQuery?: Partial<Query<C, BD, BE, BR>>;
    private defaultMutation?: Partial<Mutation<C, BD, BE, BR>>;
    private managedQueries = new Set<Pick<QueryManager<C, BD, BE, BR>, 'getState' | 'getApi'>>();
    private managedMutations = new Set<Pick<MutationManager<C, BD, BE, BR>, 'getState' | 'getApi'>>();

    public readonly hash: (value: unknown) => string;

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
        this.defaultRequest = defaultRequest;
        this.defaultQuery = defaultQuery;
        this.defaultMutation = defaultMutation;
    }

    public manageQuery<D extends BD, E extends BE, R extends BR>(
        query: Query<C, D, E, R> | undefined,
        onChange: (result: QueryManagerResult<D, E>) => void,
        ssrPromisesManager?: SsrPromisesManager,
    ): [QueryManagerResult<D, E>, () => void] {
        const queryManager = new QueryManager({
            query: query ? this.getMergedQuery(query) : undefined,
            queryProcessor: this.queryProcessor,
            onChange,
            ssrPromisesManager,
        });

        this.managedQueries.add(queryManager);

        return [
            queryManager.getResult(),
            () => {
                queryManager.cleanup();
                this.managedQueries.delete(queryManager);
            },
        ];
    }

    public manageMutation<D extends BD, E extends BE, R extends BR>(
        mutation: Mutation<C, D, E, R> | undefined,
        onChange: (result: MutationManagerResult<D, E>) => void,
    ): [MutationManagerResult<D, E>, () => void] {
        const mutationManager = new MutationManager({
            mutation: mutation ? this.getMergedMutation(mutation) : undefined,
            mutationProcessor: this.mutationProcessor,
            onChange: onChange,
        });

        this.managedMutations.add(mutationManager);

        return [
            mutationManager.getResult(),
            () => {
                mutationManager.cleanup();
                this.managedMutations.delete(mutationManager);
            },
        ];
    }

    public query<D extends BD, E extends BE, R extends BR>(
        query: Query<C, D, E, R>,
        onChange?: (state: QueryState<D, E>) => void,
    ): QueryResult<D, E> {
        return this.queryProcessor.query(this.getMergedQuery(query), onChange);
    }

    public fetchQuery<D extends BD, E extends BE, R extends BR>(query: Query<C, D, E, R>): Promise<D> {
        return this.queryProcessor.fetchQuery(this.getMergedQuery(query));
    }

    public readQuery<D extends BD, E extends BE, R extends BR>(
        query: Query<C, D, E, R>,
        onChange?: (state: QueryState<D, E>) => void,
    ): QueryState<D, E> {
        return this.queryProcessor.readQuery(this.getMergedQuery(query), onChange);
    }

    public mutate<D extends BD, E extends BE, R extends BR>(mutation: Mutation<C, D, E, R>): Promise<D> {
        return this.mutationProcessor.mutate(this.getMergedMutation(mutation));
    }

    public purge() {
        this.queryProcessor.purge();
        this.mutationProcessor.purge();
        this.cache.purge();

        this.managedQueries.forEach((query) => {
            if (query.getState().executed) {
                query.getApi().execute();
            }
        });

        this.managedMutations.forEach((mutation) => {
            mutation.getApi().reset();
        });
    }

    public getCache() {
        return this.cache;
    }

    public onHydrateComplete() {
        this.queryProcessor.onHydrateComplete();
    }

    private getMergedQuery<D extends BD, E extends BE, R extends BR>(query: Query<C, D, E, R>): Query<C, D, E, R> {
        return this.merge(this.defaultRequest, this.defaultQuery, query);
    }

    private getMergedMutation<D extends BD, E extends BE, R extends BR>(
        mutation: Mutation<C, D, E, R>,
    ): Mutation<C, D, E, R> {
        return this.merge(this.defaultRequest, this.defaultMutation, mutation);
    }
}

export { Client, ClientOptions };
