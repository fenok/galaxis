import { getAbortController, wireAbortSignals } from '../promise';
import { RequestQueue } from './RequestQueue';
import { RequestHelper } from './RequestHelper';
import { BaseQuery, Cache, NonUndefined, FetchPolicy } from '../types';

export interface QueryCache<D extends NonUndefined, E extends Error> {
    error?: E | Error; // Regular error can always slip through
    data?: D;
}

export type QueryState<D extends NonUndefined, E extends Error> = {
    cache?: QueryCache<D, E>;
    requestRequired: boolean;
};

export interface QueryResult<D extends NonUndefined, E extends Error> extends QueryState<D, E> {
    request?: Promise<D>;
    unsubscribe?(): void;
}

export interface QueryRequest {
    cacheableQuery?: unknown;
    promise: Promise<unknown>;
    loading: number;
    abortController?: AbortController;
    shouldRerun?: boolean;
}

export interface QueryProcessorOptions<C extends NonUndefined> {
    cache: Cache<C>;
    requestQueue: RequestQueue;
    hash(value: unknown): string;
}

export class QueryProcessor<C extends NonUndefined> {
    private ongoingRequests: { [requestId: string]: QueryRequest | undefined } = {};
    private isHydrate = true;
    private readonly cache: Cache<C>;
    private readonly requestQueue: RequestQueue;
    private hash: (value: unknown) => string;

    constructor({ cache, requestQueue, hash }: QueryProcessorOptions<C>) {
        this.cache = cache;
        this.requestQueue = requestQueue;
        this.hash = hash;
    }

    public onHydrateComplete() {
        this.isHydrate = false;
    }

    public purge() {
        Object.values(this.ongoingRequests).forEach((request) => request?.abortController?.abort());
        this.ongoingRequests = {};
    }

    public query<D extends NonUndefined, E extends Error, R>(query: BaseQuery<C, D, E, R>): Promise<D> {
        const requestId = query.getRequestId ? query.getRequestId(query) : this.hash(query.requestParams);
        return this.getRequestPromise(query, requestId);
    }

    public watchQuery<D extends NonUndefined, E extends Error, R>(
        query: BaseQuery<C, D, E, R>,
        onChange?: (state: QueryState<D, E>) => void,
    ): QueryResult<D, E> {
        const requestId = query.getRequestId ? query.getRequestId(query) : this.hash(query.requestParams);
        let queryState = this.getQueryState(query);

        return {
            ...queryState,
            request:
                queryState.requestRequired && this.isRequestAllowed(query, queryState.cache)
                    ? this.getRequestPromise(query, requestId)
                    : undefined,
            unsubscribe:
                queryState.cache && onChange
                    ? this.cache.subscribe(() => {
                          const newState = this.getQueryState(query);

                          if (!this.areQueryStatesEqual(queryState, newState)) {
                              queryState = newState;
                              onChange(newState);
                          }
                      })
                    : undefined,
        };
    }

    public getQueryState<D extends NonUndefined, E extends Error, R>(query: BaseQuery<C, D, E, R>): QueryState<D, E> {
        const requestId = query.getRequestId ? query.getRequestId(query) : this.hash(query.requestParams);

        const cache = !this.isFetchPolicy(query.fetchPolicy, 'no-cache')
            ? {
                  error: this.cache.getError(requestId),
                  data: query.fromCache?.({
                      cacheData: this.cache.getData(),
                      requestParams: query.requestParams,
                      requestId,
                  }),
              }
            : undefined;

        return {
            cache,
            requestRequired: this.isRequestRequired(query, cache),
        };
    }

    private getRequestPromise<D extends NonUndefined, E extends Error, R>(
        query: BaseQuery<C, D, E, R>,
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

    private ensureQueryRequest<D extends NonUndefined, E extends Error, R>(
        query: BaseQuery<C, D, E, R>,
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
                cacheableQuery: isQueryCacheable ? query : undefined,
                promise: Promise.resolve(),
            };

            queryRequest.promise = this.getQueryPromise(query, requestId, queryRequest);

            this.ongoingRequests[requestId] = queryRequest;
        } else {
            currentQueryRequest.loading++;
            if (!currentQueryRequest.cacheableQuery && isQueryCacheable) {
                currentQueryRequest.cacheableQuery = query;
            }

            if (query.forceRequestOnMerge) {
                currentQueryRequest.shouldRerun = true;
                currentQueryRequest.abortController?.abort();
            }
        }

        return this.ongoingRequests[requestId]!;
    }

    private getQueryPromise<D extends NonUndefined, E extends Error, R>(
        query: BaseQuery<C, D, E, R>,
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

                        if (queryRequest.cacheableQuery) {
                            this.updateCache(queryRequest.cacheableQuery as BaseQuery<C, D, E, R>, requestId, {
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

                        if (queryRequest.cacheableQuery) {
                            this.updateCache(queryRequest.cacheableQuery as BaseQuery<C, D, E, R>, requestId, {
                                type: 'fail',
                                error,
                            });
                        }
                    }
                }
                throw error;
            });
    }

    private updateCache<D extends NonUndefined, E extends Error, R>(
        query: BaseQuery<C, D, E, R>,
        requestId: string,
        action: { type: 'fail'; error: E } | { type: 'success'; data: D },
    ) {
        if (action.type === 'success') {
            this.cache.update({
                data: query.toCache
                    ? query.toCache({
                          cacheData: this.cache.getData(),
                          data: action.data,
                          requestParams: query.requestParams,
                          requestId,
                      })
                    : undefined,
                error: [requestId, undefined],
            });
        } else {
            this.cache.update({
                error: [requestId, action.error],
            });
        }
    }

    private isRequestRequired<D extends NonUndefined, E extends Error, R>(
        query: BaseQuery<C, D, E, R>,
        queryCache?: QueryCache<D, E>,
    ): boolean {
        return !(
            query.lazy ||
            this.isFetchPolicy(query.fetchPolicy, 'cache-only') ||
            (this.isFetchPolicy(query.fetchPolicy, 'cache-first') && queryCache?.data !== undefined) ||
            (query.optimizeOnHydrate &&
                this.isHydrate &&
                (queryCache?.data !== undefined || queryCache?.error !== undefined))
        );
    }

    private isRequestAllowed<D extends NonUndefined, E extends Error, R>(
        query: BaseQuery<C, D, E, R>,
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
        return (fetchPolicy || 'cache-only') === value;
    }

    private areQueryStatesEqual<D extends NonUndefined, E extends Error>(
        a: QueryState<D, E>,
        b: QueryState<D, E>,
    ): boolean {
        // Since we compare states of the same query, that's all we need, as flags are the same if data and error are.
        return a.cache?.error === b.cache?.error && a.cache?.data === b.cache?.data;
    }
}
