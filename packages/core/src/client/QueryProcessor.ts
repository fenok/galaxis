import { getAbortController, wireAbortSignals } from '../promise';
import { RequestQueue } from './RequestQueue';
import { BaseRequestHelper } from './BaseRequestHelper';
import { BaseQuery, Cache, NonUndefined } from '../types';

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

export interface QueryResult<D extends NonUndefined, E extends Error> {
    cache?: QueryCache<D, E>;
    requestFlags: QueryRequestFlags;
    request?: Promise<D>;
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
        Object.values(this.ongoingRequests).forEach((request) => request?.abortController?.abort());
        this.ongoingRequests = {};
    }

    public query<D extends NonUndefined, E extends Error, R>(
        query: BaseQuery<C, D, E, R>,
        requestFlags?: Partial<QueryRequestFlags>,
    ): QueryResult<D, E> {
        const requestId = query.getRequestId(query);
        const queryState = this.getQueryState(query);

        const requestRequired = requestFlags?.required ?? queryState.requestFlags.required;
        const requestAllowed = requestFlags?.allowed ?? queryState.requestFlags.allowed;

        return {
            ...queryState,
            request: requestRequired && requestAllowed ? this.getRequestPromise(query, requestId) : undefined,
        };
    }

    public getQueryState<D extends NonUndefined, E extends Error, R>(query: BaseQuery<C, D, E, R>): QueryState<D, E> {
        const requestId = query.getRequestId(query);

        const cache =
            query.fetchPolicy !== 'no-cache'
                ? {
                      error: this.cache.getRequestError(requestId),
                      data: query.fromCache?.({
                          cacheData: this.cache.getCacheData(),
                          requestParams: query.requestParams,
                          requestId,
                      }),
                  }
                : undefined;

        return {
            cache,
            requestFlags: {
                required: this.isRequestRequired(query, cache),
                allowed: this.isRequestAllowed(query, cache),
            },
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
        const isQueryCacheable = query.fetchPolicy !== 'no-cache';

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

            if (query.forceNewRequestOnRequestMerge) {
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
                BaseRequestHelper.getPromiseFactory(query, {
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
        this.cache.updateState({
            updateRequestError: {
                requestId,
                update: () => (action.type === 'success' ? undefined : action.error),
            },
            updateCacheData: (cacheData) => {
                if (action.type === 'fail') {
                    return cacheData;
                } else {
                    return query.toCache
                        ? query.toCache({
                              cacheData,
                              data: action.data,
                              requestParams: query.requestParams,
                              requestId,
                          })
                        : cacheData;
                }
            },
        });
    }

    private isRequestRequired<D extends NonUndefined, E extends Error, R>(
        query: BaseQuery<C, D, E, R>,
        queryCache?: QueryCache<D, E>,
    ): boolean {
        return !(
            query.fetchPolicy === 'cache-only' ||
            (query.fetchPolicy === 'cache-first' && this.isRequestStateSufficient(queryCache)) ||
            (query.preventExcessRequestOnHydrate && this.isHydrate && this.isRequestStateSufficient(queryCache))
        );
    }

    private isRequestAllowed<D extends NonUndefined, E extends Error, R>(
        query: BaseQuery<C, D, E, R>,
        queryCache?: QueryCache<D, E>,
    ): boolean {
        return (
            typeof window !== 'undefined' ||
            (!query.disableSsr &&
                query.fetchPolicy !== 'no-cache' &&
                queryCache?.data === undefined &&
                queryCache?.error === undefined)
        );
    }

    private isRequestStateSufficient<D extends NonUndefined, E extends Error>(queryCache?: QueryCache<D, E>): boolean {
        return queryCache?.data !== undefined;
    }
}
