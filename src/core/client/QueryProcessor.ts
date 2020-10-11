import { MultiAbortSignal, MultiAbortController, RerunController } from '../promise/controllers';
import { wireAbortSignals } from '../promise';
import { RequestState } from './Client';
import * as logger from '../logger';
import { NetworkRequestQueue } from './NetworkRequestQueue';
import { NetworkRequestHelper } from './NetworkRequestHelper';
import { NonUndefined, YarfRequest, Cache } from '../types';

export interface QueryOptions {
    requesterId: string;
    forceNetworkRequest?: boolean; // Perform a network request regardless of fetchPolicy and cache state
    disableNetworkRequestReuse?: boolean; // Perform new network request instead of reusing the existing one
    abortSignal?: MultiAbortSignal | AbortSignal;
}

export interface QueryResult<R extends NonUndefined, E extends Error> {
    fromCache: RequestState<R, E>;
    fromNetwork?: Promise<R>;
}

export interface QueryPromiseData {
    promise?: Promise<any>;
    loading: Set<string>;
    aborted: boolean;
    abort(): void;
    rerunNetworkRequest(): void;
}

export interface QueryProcessorOptions<C extends NonUndefined> {
    cache: Cache<C>;
    networkRequestQueue: NetworkRequestQueue;
}

export class QueryProcessor<C extends NonUndefined> {
    private queries: { [requestId: string]: QueryPromiseData | undefined } = {};
    private isDataRefetchEnabled = false;
    private readonly cache: Cache<C>;
    private networkRequestQueue: NetworkRequestQueue;

    constructor({ cache, networkRequestQueue }: QueryProcessorOptions<C>) {
        this.cache = cache;
        this.networkRequestQueue = networkRequestQueue;
    }

    public enableDataRefetch() {
        this.isDataRefetchEnabled = true;
    }

    public purge() {
        Object.values(this.queries).forEach(query => query?.abort());
        this.queries = {};
    }

    public getCompleteRequestState<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requesterId: string,
    ): RequestState<R, E> {
        const requestId = request.getId(request.requestInit);
        const cacheRequestState = this.cache.getRequestState(requestId);

        return {
            loading: cacheRequestState.loading,
            error: cacheRequestState.error,
            data: request.fromCache({
                cacheData: this.cache.getCacheData(),
                requestInit: request.requestInit,
                requestId,
                requesterId,
            }),
        };
    }

    public query<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requestOptions: QueryOptions,
    ): QueryResult<R, E> {
        const requestState = this.getCompleteRequestState(request, requestOptions.requesterId);

        return {
            fromCache: requestState,
            fromNetwork: !this.shouldReturnOrThrowFromState(request, requestState, requestOptions)
                ? this.getDataFromNetwork(request, requestOptions)?.catch(error => {
                      this.warnAboutDivergedError(error, request, requestOptions.requesterId);
                      throw error;
                  })
                : undefined,
        };
    }

    private getDataFromNetwork<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        options: QueryOptions,
    ): Promise<R> | undefined {
        const { requesterId, abortSignal } = options;

        const requestData = this.initQueryPromiseData(request, options);

        const onAbort = (multi?: boolean) => {
            requestData.loading.delete(requesterId);

            if (multi || requestData.loading.size === 0) {
                requestData.abort();
            } else {
                const requestId = request.getId(request.requestInit);

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
        request: YarfRequest<C, R, E, I>,
        { disableNetworkRequestReuse, requesterId }: QueryOptions,
    ): QueryPromiseData {
        const requestId = request.getId(request.requestInit);

        if (!this.queries[requestId] || this.queries[requestId]?.aborted) {
            const multiAbortController = new MultiAbortController();
            const rerunController = new RerunController();

            const requestPromiseData: QueryPromiseData = {
                rerunNetworkRequest() {
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

            if (typeof window !== 'undefined' || this.shouldMakeNetworkRequestOnSsr(request, requesterId)) {
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

            if (disableNetworkRequestReuse) {
                this.queries[requestId]!.rerunNetworkRequest();
            }
        }

        return this.queries[requestId]!;
    }

    private shouldMakeNetworkRequestOnSsr<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requesterId: string,
    ): boolean {
        const requestState = this.getCompleteRequestState(request, requesterId);

        return (
            !request.disableSsr &&
            typeof window === 'undefined' &&
            request.fetchPolicy !== 'cache-only' &&
            requestState.data === undefined &&
            requestState.error === undefined
        );
    }

    private shouldReturnOrThrowFromState<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requestState: RequestState<R, E>,
        queryOptions: QueryOptions,
    ): boolean {
        return (
            queryOptions.forceNetworkRequest !== true &&
            (request.fetchPolicy === 'cache-only' ||
                (request.fetchPolicy === 'cache-first' &&
                    this.isCachedDataSufficient(request, requestState, queryOptions)) ||
                (Boolean(request.enableInitialRenderDataRefetchOptimization) &&
                    !this.isDataRefetchEnabled &&
                    this.isCachedDataSufficient(request, requestState, queryOptions)))
        );
    }

    private isCachedDataSufficient<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requestState: RequestState<R, E>,
        queryOptions: QueryOptions,
    ): boolean {
        return (
            requestState.data !== undefined &&
            (!request.optimisticResponse ||
                !request.optimisticResponse.isOptimisticData({
                    data: requestState.data,
                    cacheData: this.cache.getCacheData(),
                    requestInit: request.requestInit,
                    requestId: request.getId(request.requestInit),
                    requesterId: queryOptions.requesterId,
                }))
        );
    }

    private warnAboutDivergedError<R extends NonUndefined, E extends Error, I>(
        error: Error,
        request: YarfRequest<C, R, E, I>,
        requesterId: string,
    ) {
        if (process.env.NODE_ENV !== 'production') {
            const requestState = this.getCompleteRequestState(request, requesterId);
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
