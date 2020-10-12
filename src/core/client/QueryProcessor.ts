import { MultiAbortController, RerunController, wireAbortSignals } from '../promise';
import { RequestState } from './Client';
import * as logger from '../logger';
import { NetworkRequestQueue } from './NetworkRequestQueue';
import { NetworkRequestHelper } from './NetworkRequestHelper';
import { NonUndefined, QueryInit, Cache } from '../types';

export interface QueryResult<R extends NonUndefined, E extends Error> {
    fromCache: RequestState<R, E>;
    fromNetwork?: Promise<R>;
}

export interface QueryNetworkRequest {
    promise?: Promise<any>;
    loading: Set<string>;
    aborted: boolean;
    abort(): void;
    rerun(): void;
}

export interface QueryProcessorOptions<C extends NonUndefined> {
    cache: Cache<C>;
    networkRequestQueue: NetworkRequestQueue;
}

export class QueryProcessor<C extends NonUndefined> {
    private queries: { [requestId: string]: QueryNetworkRequest | undefined } = {};
    private isHydrate = true;
    private readonly cache: Cache<C>;
    private networkRequestQueue: NetworkRequestQueue;

    constructor({ cache, networkRequestQueue }: QueryProcessorOptions<C>) {
        this.cache = cache;
        this.networkRequestQueue = networkRequestQueue;
    }

    public onHydrateComplete() {
        this.isHydrate = false;
    }

    public purge() {
        Object.values(this.queries).forEach(query => query?.abort());
        this.queries = {};
    }

    public getQueryState<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
    ): RequestState<R, E> {
        const requestId = request.getRequestId(request.requestInit);
        const cacheRequestState = this.cache.getRequestState(requestId);

        return {
            loading: cacheRequestState.loading,
            error: cacheRequestState.error,
            data: request.fromCache({
                cacheData: this.cache.getCacheData(),
                requestInit: request.requestInit,
                requestId,
                requesterId: request.requesterId,
            }),
        };
    }

    public query<R extends NonUndefined, E extends Error, I>(request: QueryInit<C, R, E, I>): QueryResult<R, E> {
        const requestState = this.getQueryState(request);

        const isFromCache = this.shouldReturnOrThrowFromState(request, requestState);

        if (isFromCache) {
            this.ensureNonLoadingState(request.getRequestId(request.requestInit));
        }

        return {
            fromCache: requestState,
            fromNetwork: !isFromCache
                ? this.getDataFromNetwork(request)?.catch(error => {
                      this.warnAboutDivergedError(error, request);
                      throw error;
                  })
                : undefined,
        };
    }

    private ensureNonLoadingState(requestId: string) {
        if (!this.queries[requestId]) {
            this.cache.updateState({
                updateRequestState: {
                    requestId,
                    update: ({ error }) => ({
                        error,
                        loading: [],
                    }),
                },
            });
        }
    }

    private getDataFromNetwork<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
    ): Promise<R> | undefined {
        const { requesterId, abortSignal } = request;

        const requestData = this.initQueryPromiseData(request);

        const onAbort = (multi?: boolean) => {
            requestData.loading.delete(requesterId);

            if (multi || requestData.loading.size === 0) {
                requestData.abort();
            } else {
                const requestId = request.getRequestId(request.requestInit);

                this.cache.updateState({
                    updateRequestState: {
                        requestId,
                        update: ({ error }) => ({
                            error,
                            loading: [...requestData.loading],
                        }),
                    },
                });
            }
        };

        wireAbortSignals(onAbort, abortSignal);

        return requestData.promise;
    }

    private initQueryPromiseData<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
    ): QueryNetworkRequest {
        const requestId = request.getRequestId(request.requestInit);
        const { requesterId, rerunExistingNetworkRequest } = request;

        if (!this.queries[requestId] || this.queries[requestId]?.aborted) {
            const multiAbortController = new MultiAbortController();
            const rerunController = new RerunController();

            const requestPromiseData: QueryNetworkRequest = {
                rerun() {
                    rerunController.rerun();
                },
                abort() {
                    multiAbortController.abort();
                },
                get aborted() {
                    return Boolean(multiAbortController.signal.aborted);
                },
                loading: new Set([requesterId]),
            };

            if (typeof window !== 'undefined' || this.shouldMakeNetworkRequestOnSsr(request)) {
                requestPromiseData.promise = this.networkRequestQueue
                    .addPromise(
                        NetworkRequestHelper.getPromiseFactory(request, {
                            multiAbortSignal: multiAbortController.signal,
                            rerunSignal: rerunController.signal,
                        }),
                        'query',
                    )
                    .then(data => {
                        if (this.queries[requestId] === requestPromiseData) {
                            this.queries[requestId] = undefined;

                            this.cache.updateState({
                                updateRequestState: {
                                    requestId,
                                    update: () => ({
                                        error: undefined,
                                        loading: [],
                                    }),
                                },
                                updateCacheData: cacheData =>
                                    request.toCache({
                                        cacheData: request.optimisticResponse
                                            ? request.optimisticResponse.removeOptimisticData({
                                                  cacheData: cacheData,
                                                  optimisticData: request.optimisticResponse.optimisticData,
                                                  requestInit: request.requestInit,
                                                  requestId,
                                                  requesterId,
                                              })
                                            : cacheData,
                                        data,
                                        requestInit: request.requestInit,
                                        requestId,
                                        requesterId,
                                    }),
                            });
                        }
                        return data;
                    })
                    .catch(error => {
                        if (this.queries[requestId] === requestPromiseData) {
                            this.queries[requestId] = undefined;

                            this.cache.updateState({
                                updateRequestState: {
                                    requestId,
                                    update: () => ({
                                        loading: [],
                                        error,
                                    }),
                                },
                                updateCacheData: cacheData =>
                                    request.optimisticResponse
                                        ? request.optimisticResponse.removeOptimisticData({
                                              cacheData: cacheData,
                                              optimisticData: request.optimisticResponse.optimisticData,
                                              requestInit: request.requestInit,
                                              requestId,
                                              requesterId,
                                          })
                                        : cacheData,
                            });
                        }
                        throw error;
                    });
            }

            this.queries[requestId] = requestPromiseData;

            this.cache.updateState({
                updateRequestState: {
                    requestId,
                    update: ({ error }) => ({
                        error,
                        loading: [requesterId],
                    }),
                },
                updateCacheData: cacheData =>
                    request.optimisticResponse
                        ? request.toCache({
                              cacheData,
                              data: request.optimisticResponse.optimisticData,
                              requestInit: request.requestInit,
                              requestId,
                              requesterId,
                          })
                        : cacheData,
            });
        } else {
            this.queries[requestId]!.loading.add(requesterId);

            this.cache.updateState({
                updateRequestState: {
                    requestId,
                    update: ({ error }) => ({
                        error,
                        loading: [...this.queries[requestId]!.loading],
                    }),
                },
            });

            if (rerunExistingNetworkRequest) {
                this.queries[requestId]!.rerun();
            }
        }

        return this.queries[requestId]!;
    }

    private shouldMakeNetworkRequestOnSsr<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
    ): boolean {
        const requestState = this.getQueryState(request);

        return (
            !request.disableSsr &&
            typeof window === 'undefined' &&
            requestState.data === undefined &&
            requestState.error === undefined
        );
    }

    private shouldReturnOrThrowFromState<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
        requestState: RequestState<R, E>,
    ): boolean {
        return (
            request.fetchPolicy === 'cache-only' ||
            (request.fetchPolicy === 'cache-first' && this.isCachedDataSufficient(request, requestState)) ||
            (Boolean(request.preventExcessNetworkRequestOnHydrate) &&
                this.isHydrate &&
                this.isCachedDataSufficient(request, requestState))
        );
    }

    private isCachedDataSufficient<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
        requestState: RequestState<R, E>,
    ): boolean {
        return (
            requestState.data !== undefined &&
            (!request.optimisticResponse ||
                !request.optimisticResponse.isOptimisticData({
                    data: requestState.data,
                    cacheData: this.cache.getCacheData(),
                    requestInit: request.requestInit,
                    requestId: request.getRequestId(request.requestInit),
                    requesterId: request.requesterId,
                }))
        );
    }

    private warnAboutDivergedError<R extends NonUndefined, E extends Error, I>(
        error: Error,
        request: QueryInit<C, R, E, I>,
    ) {
        if (process.env.NODE_ENV !== 'production') {
            const requestState = this.getQueryState(request);
            if (error !== requestState.error) {
                logger.warn(
                    `Error from promise diverged from error in state. This can happen for various reasons:
- Query was started, aborted, and then immediately started again (ignore)
- Cache is updated asynchronously (ignore)
- Some request function threw unexpected exception (fix that function)
- Something's wrong in the library itself (file an issue)

State error: ${requestState.error}

Actual error: ${error}`,
                );
            }
        }
    }
}
