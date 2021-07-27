import { getAbortController, wireAbortSignals } from '../promise';
import { RequestQueue } from './RequestQueue';
import { RequestHelper } from './RequestHelper';
import { Query, Cache, NonUndefined, FetchPolicy, Resource } from '../types';

export interface QueryCache<D extends NonUndefined, E extends Error> {
    error?: E;
    data?: D;
}

export interface QueryState<D extends NonUndefined, E extends Error> extends QueryCache<D, E> {
    requestRequired: boolean;
}

export interface QueryRequest {
    cacheableQueries: Query<NonUndefined, NonUndefined, Error, Resource>[];
    promise: Promise<unknown>;
    loading: number;
    abortController?: AbortController;
    shouldRerun?: boolean;
}

export interface QueryProcessorOptions<C extends NonUndefined> {
    cache: Cache<C>;
    requestQueue: RequestQueue;
    requestId(resource: unknown): string;
}

export class QueryProcessor<C extends NonUndefined> {
    private ongoingRequests: { [requestId: string]: QueryRequest | undefined } = {};
    private isHydrate = true;
    private readonly cache: Cache<C>;
    private readonly requestQueue: RequestQueue;
    private requestId: (resource: unknown) => string;

    constructor({ cache, requestQueue, requestId }: QueryProcessorOptions<C>) {
        this.cache = cache;
        this.requestQueue = requestQueue;
        this.requestId = requestId;
    }

    public onHydrateComplete() {
        this.isHydrate = false;
    }

    public onReset() {
        Object.values(this.ongoingRequests).forEach((request) => {
            if (request) {
                request.shouldRerun = true;
                request.abortController?.abort();
            }
        });
    }

    public query<D extends NonUndefined, E extends Error, R extends Resource>(
        query: Query<C, D, E, R>,
        onChange?: (state: QueryState<D, E>) => void,
    ): [QueryState<D, E>, Promise<D> | undefined, (() => void) | undefined] {
        const requestId = this.requestId(query.resource);

        let queryState: QueryState<D, E>;
        let unsubscribe: (() => void) | undefined;

        if (onChange) {
            [queryState, unsubscribe] = this.watchQuery(query, onChange);
        } else {
            queryState = this.readQuery(query);
        }

        return [
            queryState,
            queryState.requestRequired && this.isRequestAllowed(query, queryState)
                ? this.getRequestPromise(query, requestId)
                : undefined,
            unsubscribe,
        ];
    }

    public fetchQuery<D extends NonUndefined, E extends Error, R extends Resource>(
        query: Query<C, D, E, R>,
    ): Promise<D> {
        if (this.isFetchPolicy(query.fetchPolicy, 'cache-only')) {
            return Promise.reject(new Error("Can't fetch query with 'cache-only' fetch policy"));
        }

        const requestId = this.requestId(query.resource);
        return this.getRequestPromise(query, requestId);
    }

    public readQuery<D extends NonUndefined, E extends Error, R extends Resource>(
        query: Query<C, D, E, R>,
    ): QueryState<D, E> {
        const requestId = this.requestId(query.resource);

        const cache = !this.isFetchPolicy(query.fetchPolicy, 'no-cache')
            ? {
                  error: this.cache.getError(requestId) as E,
                  data: query.fromCache?.({
                      cacheData: this.cache.getData(),
                      resource: query.resource,
                      requestId,
                  }),
              }
            : undefined;

        return {
            ...cache,
            requestRequired: this.isRequestRequired(query, cache),
        };
    }

    public watchQuery<D extends NonUndefined, E extends Error, R extends Resource>(
        query: Query<C, D, E, R>,
        onChange: (state: QueryState<D, E>) => void,
    ): [QueryState<D, E>, (() => void) | undefined] {
        let queryState = this.readQuery(query);

        return [
            queryState,
            !this.isFetchPolicy(query.fetchPolicy, 'no-cache')
                ? this.cache.subscribe(() => {
                      const newState = this.readQuery(query);

                      if (!this.areQueryStatesEqual(queryState, newState)) {
                          queryState = newState;
                          onChange(queryState);
                      }
                  })
                : undefined,
        ];
    }

    private getRequestPromise<D extends NonUndefined, E extends Error, R extends Resource>(
        query: Query<C, D, E, R>,
        requestId: string,
    ): Promise<D> {
        const queryRequest = this.ensureQueryRequest(query, requestId);

        const onAbort = () => {
            queryRequest.shouldRerun = false;
            queryRequest.abortController?.abort();
        };

        const onSoftAbort = () => {
            queryRequest.loading--;

            if (queryRequest.loading <= 0) {
                onAbort();
            }
        };

        wireAbortSignals(onSoftAbort, query.softAbortSignal);
        wireAbortSignals(onAbort, query.abortSignal);

        return queryRequest.promise as Promise<D>;
    }

    private ensureQueryRequest<D extends NonUndefined, E extends Error, R extends Resource>(
        query: Query<C, D, E, R>,
        requestId: string,
    ): QueryRequest {
        const isQueryCacheable = !this.isFetchPolicy(query.fetchPolicy, 'no-cache');

        const currentQueryRequest = this.ongoingRequests[requestId];

        if (
            !currentQueryRequest ||
            (currentQueryRequest.abortController?.signal.aborted && !currentQueryRequest.shouldRerun)
        ) {
            const abortController = getAbortController();

            const queryRequest: QueryRequest = {
                abortController,
                loading: 1,
                cacheableQueries: isQueryCacheable ? [query] : [],
                promise: Promise.resolve(),
            };

            queryRequest.promise = this.getQueryPromise(query, requestId, queryRequest);

            this.ongoingRequests[requestId] = queryRequest;
        } else {
            currentQueryRequest.loading++;
            if (isQueryCacheable) {
                // TODO: Add query only if it updates the cache differently
                // Update functions should be pure, so it should be possible to just compare the functions code
                currentQueryRequest.cacheableQueries.push(query);
            }

            if (query.forceRequestOnMerge) {
                currentQueryRequest.shouldRerun = true;
                currentQueryRequest.abortController?.abort();
            }
        }

        return this.ongoingRequests[requestId]!;
    }

    private getQueryPromise<D extends NonUndefined, E extends Error, R extends Resource>(
        query: Query<C, D, E, R>,
        requestId: string,
        queryRequest: QueryRequest,
    ): Promise<D> {
        return this.requestQueue
            .addPromise(
                RequestHelper.getPromiseFactory(query, {
                    abortSignal: queryRequest.abortController?.signal,
                }),
                'query',
            )
            .then((data) => {
                if (this.ongoingRequests[requestId] === queryRequest) {
                    if (queryRequest.shouldRerun) {
                        queryRequest.shouldRerun = false;
                        queryRequest.abortController = getAbortController();

                        return this.getQueryPromise(query, requestId, queryRequest);
                    } else {
                        this.ongoingRequests[requestId] = undefined;

                        if (queryRequest.cacheableQueries.length) {
                            this.updateCache(queryRequest.cacheableQueries as Query<C, D, E, R>[], requestId, {
                                type: 'success',
                                data,
                            });
                        }
                    }
                }
                return data;
            })
            .catch((error: Error) => {
                if (this.ongoingRequests[requestId] === queryRequest) {
                    if (queryRequest.shouldRerun) {
                        queryRequest.shouldRerun = false;
                        queryRequest.abortController = getAbortController();

                        return this.getQueryPromise(query, requestId, queryRequest);
                    } else {
                        this.ongoingRequests[requestId] = undefined;

                        if (queryRequest.cacheableQueries.length) {
                            this.updateCache(queryRequest.cacheableQueries as Query<C, D, E, R>[], requestId, {
                                type: 'fail',
                                error,
                            });
                        }
                    }
                }
                throw error;
            });
    }

    private updateCache<D extends NonUndefined, E extends Error, R extends Resource>(
        queries: Query<C, D, E, R>[],
        requestId: string,
        action: { type: 'fail'; error: E } | { type: 'success'; data: D },
    ) {
        if (action.type === 'success') {
            this.cache.update({
                data: (prevData) =>
                    queries.reduce(
                        (data, query) =>
                            query.toCache
                                ? query.toCache({
                                      cacheData: data,
                                      data: action.data,
                                      resource: query.resource,
                                      requestId,
                                  })
                                : data,
                        prevData,
                    ),
                errors: { [requestId]: () => undefined },
            });
        } else {
            this.cache.update({
                errors: { [requestId]: () => action.error },
            });
        }
    }

    private isRequestRequired<D extends NonUndefined, E extends Error, R extends Resource>(
        query: Query<C, D, E, R>,
        queryCache?: QueryCache<D, E>,
    ): boolean {
        return !(
            this.isFetchPolicy(query.fetchPolicy, 'cache-only') ||
            (this.isFetchPolicy(query.fetchPolicy, 'cache-first') && queryCache?.data !== undefined) ||
            (query.optimizeOnHydrate &&
                this.isHydrate &&
                (queryCache?.data !== undefined || queryCache?.error !== undefined))
        );
    }

    private isRequestAllowed<D extends NonUndefined, E extends Error, R extends Resource>(
        query: Query<C, D, E, R>,
        queryCache?: QueryCache<D, E>,
    ): boolean {
        return (
            typeof window !== 'undefined' ||
            (!query.disableSsr &&
                !this.isFetchPolicy(query.fetchPolicy, 'no-cache') &&
                queryCache?.data === undefined &&
                queryCache?.error === undefined)
        );
    }

    private isFetchPolicy(fetchPolicy: FetchPolicy | undefined, value: FetchPolicy): boolean {
        return (fetchPolicy || 'cache-and-network') === value;
    }

    private areQueryStatesEqual<D extends NonUndefined, E extends Error>(
        a: QueryState<D, E>,
        b: QueryState<D, E>,
    ): boolean {
        // Since we compare states of the same query, that's all we need, as flags are the same if data and error are.
        return a.error === b.error && a.data === b.data;
    }
}
