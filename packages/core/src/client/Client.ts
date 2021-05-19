import { QueryProcessor, QueryResult, QueryState } from './QueryProcessor';
import { MutationProcessor } from './MutationProcessor';
import { RequestQueue } from './RequestQueue';
import { Cache, Mutation, NonUndefined, Query } from '../types';
import { DefaultsMerger, DefaultsMergerOptions } from './DefaultsMerger';
import { RequestManager } from './RequestManager';
import { QueryManagerState } from './QueryManager';
import { MutationManagerResult } from './MutationManager';

interface ClientOptions<
    C extends NonUndefined = NonUndefined,
    CACHE extends Cache<C> = Cache<C>,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR = unknown
> extends DefaultsMergerOptions<C, BD, BE, BR> {
    cache: CACHE;
    hash(value: unknown): string;
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
    private requestManager: RequestManager<C, BD, BE, BR>;
    private defaultsMerger: DefaultsMerger<C, BD, BE, BR>;

    public readonly hash: (value: unknown) => string;

    public constructor({
        cache,
        merge,
        defaultRequest,
        defaultQuery,
        defaultMutation,
        hash,
    }: ClientOptions<C, CACHE, BD, BE, BR>) {
        const requestQueue = new RequestQueue();
        this.hash = hash;
        this.cache = cache;
        this.queryProcessor = new QueryProcessor({ cache, requestQueue, hash });
        this.mutationProcessor = new MutationProcessor({ cache, requestQueue, hash });
        this.defaultsMerger = new DefaultsMerger({ merge, defaultRequest, defaultQuery, defaultMutation });
        this.requestManager = new RequestManager({
            queryProcessor: this.queryProcessor,
            mutationProcessor: this.mutationProcessor,
            defaultsMerger: this.defaultsMerger,
        });
    }

    public getQueryManager<D extends BD, E extends BE, R extends BR>(
        onChange: (result: QueryManagerState<D, E>) => void,
    ) {
        return this.requestManager.getQueryManager<D, E, R>(onChange);
    }

    public getMutationManager<D extends BD, E extends BE, R extends BR>(
        mutation: Mutation<C, D, E, R> | undefined,
        onChange: (result: MutationManagerResult<D, E>) => void,
    ) {
        return this.requestManager.manageMutation(mutation, onChange);
    }

    public query<D extends BD, E extends BE, R extends BR>(
        query: Query<C, D, E, R>,
        onChange?: (state: QueryState<D, E>) => void,
    ): QueryResult<D, E> {
        return this.queryProcessor.query(this.defaultsMerger.getMergedQuery(query), onChange);
    }

    public fetchQuery<D extends BD, E extends BE, R extends BR>(query: Query<C, D, E, R>): Promise<D> {
        return this.queryProcessor.fetchQuery(this.defaultsMerger.getMergedQuery(query));
    }

    public readQuery<D extends BD, E extends BE, R extends BR>(
        query: Query<C, D, E, R>,
        onChange?: (state: QueryState<D, E>) => void,
    ): QueryState<D, E> {
        return this.queryProcessor.readQuery(this.defaultsMerger.getMergedQuery(query), onChange);
    }

    public mutate<D extends BD, E extends BE, R extends BR>(mutation: Mutation<C, D, E, R>): Promise<D> {
        return this.mutationProcessor.mutate(this.defaultsMerger.getMergedMutation(mutation));
    }

    public purge() {
        this.queryProcessor.purge();
        this.mutationProcessor.purge();
        this.cache.purge();
        this.requestManager.purge();
    }

    public getCache() {
        return this.cache;
    }

    public onHydrateComplete() {
        this.queryProcessor.onHydrateComplete();
    }
}

export { Client, ClientOptions };
