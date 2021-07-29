import { QueryProcessor, QueryState } from './QueryProcessor';
import { MutationProcessor } from './MutationProcessor';
import { RequestQueue } from './RequestQueue';
import { Cache, Mutation, NonUndefined, Query, Resource } from '../types';
import { DefaultsMerger, DefaultsMergerOptions } from './DefaultsMerger';

interface ClientOptions<
    TCacheData extends NonUndefined,
    TCache extends Cache<TCacheData>,
    TBaseData extends NonUndefined,
    TBaseError extends Error,
    TBaseResource extends Resource
> extends DefaultsMergerOptions<TCacheData, TBaseData, TBaseError> {
    cache: TCache;
    requestId(resource: TBaseResource): string;
}

class Client<
    TCacheData extends NonUndefined,
    TCache extends Cache<TCacheData>,
    TBaseData extends NonUndefined,
    TBaseError extends Error,
    TBaseResource extends Resource
> {
    private readonly cache: TCache;
    private queryProcessor: QueryProcessor<TCacheData>;
    private mutationProcessor: MutationProcessor<TCacheData>;
    private defaultsMerger: DefaultsMerger<TCacheData, TBaseData, TBaseError>;

    private onResetListeners: Set<() => void> = new Set();

    public readonly requestId: (resource: TBaseResource) => string;

    public constructor({
        cache,
        requestId,
        defaultRequest,
        defaultQuery,
        defaultMutation,
    }: ClientOptions<TCacheData, TCache, TBaseData, TBaseError, TBaseResource>) {
        const requestQueue = new RequestQueue();
        this.requestId = requestId;
        this.cache = cache;
        this.queryProcessor = new QueryProcessor({ cache, requestQueue, requestId });
        this.mutationProcessor = new MutationProcessor({ cache, requestQueue, requestId });
        this.defaultsMerger = new DefaultsMerger({ defaultRequest, defaultQuery, defaultMutation });
    }

    public query<TData extends TBaseData, TError extends TBaseError, TResource extends TBaseResource>(
        query: Query<TCacheData, TData, TError, TResource>,
        onChange?: (queryState: QueryState<TData, TError>) => void,
    ): [QueryState<TData, TError>, Promise<TData> | undefined, (() => void) | undefined] {
        return this.queryProcessor.query(this.defaultsMerger.getMergedQuery(query), onChange);
    }

    public fetchQuery<TData extends TBaseData, TError extends TBaseError, TResource extends TBaseResource>(
        query: Query<TCacheData, TData, TError, TResource>,
    ): Promise<TData> {
        return this.queryProcessor.fetchQuery(this.defaultsMerger.getMergedQuery(query));
    }

    public readQuery<TData extends TBaseData, TError extends TBaseError, TResource extends TBaseResource>(
        query: Query<TCacheData, TData, TError, TResource>,
    ): QueryState<TData, TError> {
        return this.queryProcessor.readQuery(this.defaultsMerger.getMergedQuery(query));
    }

    public watchQuery<TData extends TBaseData, TError extends TBaseError, TResource extends TBaseResource>(
        query: Query<TCacheData, TData, TError, TResource>,
        onChange: (queryState: QueryState<TData, TError>) => void,
    ): [QueryState<TData, TError>, (() => void) | undefined] {
        return this.queryProcessor.watchQuery(this.defaultsMerger.getMergedQuery(query), onChange);
    }

    public mutate<TData extends TBaseData, TError extends TBaseError, TResource extends TBaseResource>(
        mutation: Mutation<TCacheData, TData, TError, TResource>,
    ): Promise<TData> {
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
