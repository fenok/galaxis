import { QueryProcessor, QueryState } from './QueryProcessor';
import { MutationProcessor } from './MutationProcessor';
import { RequestQueue } from './RequestQueue';
import { Cache, Mutation, NonUndefined, Query, Resource } from '../types';
import { DefaultsMerger, DefaultsMergerOptions } from './DefaultsMerger';

interface ClientOptions<
    C extends NonUndefined = NonUndefined,
    CACHE extends Cache<C> = Cache<C>,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR extends Resource = Resource
> extends DefaultsMergerOptions<C, BD, BE, BR> {
    cache: CACHE;
    hash(value: unknown): string;
}

class Client<
    C extends NonUndefined = NonUndefined,
    CACHE extends Cache<C> = Cache<C>,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR extends Resource = Resource
> {
    private readonly cache: CACHE;
    private queryProcessor: QueryProcessor<C>;
    private mutationProcessor: MutationProcessor<C>;
    private defaultsMerger: DefaultsMerger<C, BD, BE, BR>;

    private onResetListeners: Set<() => void> = new Set();

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
    }

    public query<D extends BD, E extends BE, R extends BR>(
        query: Query<C, D, E, R>,
        onChange?: (queryState: QueryState<D, E>) => void,
    ): [QueryState<D, E>, Promise<D> | undefined, (() => void) | undefined] {
        return this.queryProcessor.query(this.defaultsMerger.getMergedQuery(query), onChange);
    }

    public fetchQuery<D extends BD, E extends BE, R extends BR>(query: Query<C, D, E, R>): Promise<D> {
        return this.queryProcessor.fetchQuery(this.defaultsMerger.getMergedQuery(query));
    }

    public readQuery<D extends BD, E extends BE, R extends BR>(query: Query<C, D, E, R>): QueryState<D, E> {
        return this.queryProcessor.readQuery(this.defaultsMerger.getMergedQuery(query));
    }

    public watchQuery<D extends BD, E extends BE, R extends BR>(
        query: Query<C, D, E, R>,
        onChange: (queryState: QueryState<D, E>) => void,
    ): [QueryState<D, E>, (() => void) | undefined] {
        return this.queryProcessor.watchQuery(this.defaultsMerger.getMergedQuery(query), onChange);
    }

    public mutate<D extends BD, E extends BE, R extends BR>(mutation: Mutation<C, D, E, R>): Promise<D> {
        return this.mutationProcessor.mutate(this.defaultsMerger.getMergedMutation(mutation));
    }

    public reset() {
        this.cache.clear();

        this.queryProcessor.onReset();
        this.mutationProcessor.onReset();

        this.onResetListeners.forEach((cb) => cb());
    }

    public onReset(cb: () => void) {
        this.onResetListeners.add(cb);

        return () => this.onResetListeners.delete(cb);
    }

    public getCache() {
        return this.cache;
    }

    public onHydrateComplete() {
        this.queryProcessor.onHydrateComplete();
    }
}

export { Client, ClientOptions };
