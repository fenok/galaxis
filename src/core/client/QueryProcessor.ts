import { getAbortController, wireAbortSignals } from '../promise';
import { RequestQueue } from './RequestQueue';
import { BaseRequestHelper } from './BaseRequestHelper';
import { NonUndefined, Query, Cache } from '../types';

export interface QueryCache<D extends NonUndefined, E extends Error> {
    error?: E | Error; // Regular error can always slip through
    data?: D;
}

export interface QueryRequestFlags {
    required: boolean;
    allowed: boolean;
}

export type QueryState<D extends NonUndefined, E extends Error> = {
    cache?: QueryCache<D, E>;
    requestFlags: QueryRequestFlags;
};

export interface QueryResult<R extends NonUndefined, E extends Error> {
    cache?: QueryCache<R, E>;
    requestFlags: QueryRequestFlags;
    request?: Promise<R>;
}

export interface QueryRequest {
    promise: Promise<any>;
    loading: number;
    aborted: boolean;
    abort(): void;
}

export interface QueryProcessorOptions<C extends NonUndefined> {
    cache: Cache<C>;
    requestQueue: RequestQueue;
}

export class QueryProcessor<C extends NonUndefined> {
    private ongoingRequests: { [requestId: string]: QueryRequest | undefined } = {};
    private isHydrate = true;
    private readonly cache: Cache<C>;
    private readonly requestQueue: RequestQueue;

    constructor({ cache, requestQueue }: QueryProcessorOptions<C>) {
        this.cache = cache;
        this.requestQueue = requestQueue;
    }

    public onHydrateComplete() {
        this.isHydrate = false;
    }

    public purge() {
        Object.values(this.ongoingRequests).forEach(request => request?.abort());
        this.ongoingRequests = {};
    }

    public query<R extends NonUndefined, E extends Error, I>(
        query: Query<C, R, E, I>,
        requestFlags?: Partial<QueryRequestFlags>,
    ): QueryResult<R, E> {
        const requestId = query.getRequestId(query);
        const queryState = this.getQueryState(query);

        const requestRequired = requestFlags?.required ?? queryState.requestFlags.required;
        const requestAllowed = requestFlags?.allowed ?? queryState.requestFlags.allowed;

        return {
            ...queryState,
            request: requestRequired && requestAllowed ? this.getRequestPromise(query, requestId) : undefined,
        };
    }

    public getQueryState<R extends NonUndefined, E extends Error, I>(query: Query<C, R, E, I>): QueryState<R, E> {
        const requestId = query.getRequestId(query);

        const cache =
            query.fetchPolicy !== 'no-cache'
                ? {
                      error: this.cache.getRequestError(requestId),
                      data: query.fromCache?.({
                          cacheData: this.cache.getCacheData(),
                          requestInit: query.requestInit,
                          requestId,
                      }),
                  }
                : undefined;

        return {
            cache,
            requestFlags: {
                required: this.isRequestRequired(query, requestId, cache),
                allowed: this.isRequestAllowed(query, cache),
            },
        };
    }

    private getRequestPromise<R extends NonUndefined, E extends Error, I>(
        query: Query<C, R, E, I>,
        requestId: string,
    ): Promise<R> {
        const queryRequest = this.ensureQueryRequest(query, requestId);

        const onAbort = () => {
            queryRequest.loading--;

            if (queryRequest.loading <= 0) {
                queryRequest.abort();
            }
        };

        wireAbortSignals(onAbort, query.abortSignal);

        return queryRequest.promise;
    }

    private ensureQueryRequest<R extends NonUndefined, E extends Error, I>(
        query: Query<C, R, E, I>,
        requestId: string,
    ): QueryRequest {
        const currentQueryRequest = this.ongoingRequests[requestId];

        if (!currentQueryRequest || currentQueryRequest.aborted) {
            const abortController = getAbortController();

            const queryRequest: QueryRequest = {
                abort() {
                    abortController?.abort();
                },
                get aborted() {
                    return Boolean(abortController?.signal.aborted);
                },
                loading: 1,
                promise: this.requestQueue
                    .addPromise(
                        BaseRequestHelper.getPromiseFactory(query, {
                            abortSignal: abortController?.signal,
                        }),
                        'query',
                    )
                    .then(data => {
                        if (this.ongoingRequests[requestId] === queryRequest) {
                            this.ongoingRequests[requestId] = undefined;

                            this.updateCache(query, requestId, { type: 'success', data });
                        }
                        return data;
                    })
                    .catch(error => {
                        if (this.ongoingRequests[requestId] === queryRequest) {
                            this.ongoingRequests[requestId] = undefined;

                            this.updateCache(query, requestId, { type: 'fail', error });
                        }
                        throw error;
                    }),
            };

            this.ongoingRequests[requestId] = queryRequest;

            this.updateCache(query, requestId, { type: 'start' });
        } else {
            currentQueryRequest.loading++;
        }

        return this.ongoingRequests[requestId]!;
    }

    private updateCache<R extends NonUndefined, E extends Error, I>(
        query: Query<C, R, E, I>,
        requestId: string,
        action: { type: 'start' } | { type: 'fail'; error: E } | { type: 'success'; data: R },
    ) {
        this.cache.updateState({
            updateRequestError: {
                requestId,
                update: requestError =>
                    action.type !== 'fail' ? (action.type !== 'success' ? requestError : undefined) : action.error,
            },
            updateCacheData: cacheData => {
                if (action.type === 'start') {
                    return query.optimisticData && query.toCache
                        ? query.toCache({
                              cacheData,
                              data: query.optimisticData,
                              requestInit: query.requestInit,
                              requestId,
                          })
                        : cacheData;
                } else if (action.type === 'fail') {
                    return query.optimisticData && query.removeOptimisticData
                        ? query.removeOptimisticData({
                              cacheData,
                              data: query.optimisticData,
                              requestInit: query.requestInit,
                              requestId,
                          })
                        : cacheData;
                } else {
                    return query.toCache
                        ? query.toCache({
                              cacheData:
                                  query.optimisticData && query.removeOptimisticData
                                      ? query.removeOptimisticData({
                                            cacheData: cacheData,
                                            data: query.optimisticData,
                                            requestInit: query.requestInit,
                                            requestId,
                                        })
                                      : cacheData,
                              data: action.data,
                              requestInit: query.requestInit,
                              requestId,
                          })
                        : cacheData;
                }
            },
        });
    }

    private isRequestRequired<R extends NonUndefined, E extends Error, I>(
        query: Query<C, R, E, I>,
        requestId: string,
        queryCache?: QueryCache<R, E>,
    ): boolean {
        return !(
            query.fetchPolicy === 'cache-only' ||
            (query.fetchPolicy === 'cache-first' && this.isRequestStateSufficient(query, requestId, queryCache)) ||
            (query.preventExcessRequestOnHydrate &&
                this.isHydrate &&
                this.isRequestStateSufficient(query, requestId, queryCache))
        );
    }

    private isRequestAllowed<R extends NonUndefined, E extends Error, I>(
        query: Query<C, R, E, I>,
        queryCache?: QueryCache<R, E>,
    ): boolean {
        return (
            typeof window !== 'undefined' ||
            (!query.disableSsr && queryCache?.data === undefined && queryCache?.error === undefined)
        );
    }

    private isRequestStateSufficient<R extends NonUndefined, E extends Error, I>(
        query: Query<C, R, E, I>,
        requestId: string,
        queryCache?: QueryCache<R, E>,
    ): boolean {
        return (
            queryCache?.data !== undefined &&
            !query.isOptimisticData?.({
                data: queryCache.data,
                cacheData: this.cache.getCacheData(),
                requestInit: query.requestInit,
                requestId,
            })
        );
    }
}
