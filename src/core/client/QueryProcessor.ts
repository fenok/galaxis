import { NonUndefined, YarfRequest } from '../request';
import { MultiAbortSignal, MultiAbortController, RerunController } from '../promise/controllers';
import { wireAbortSignals } from '../promise/helpers';
import { RequestState } from './Client';
import * as logger from '../logger';
import { Cache } from '../cache';
import { NetworkRequestQueue } from './NetworkRequestQueue';

export interface QueryOptions {
    requesterId: string;
    forceNetworkRequest?: boolean; // Perform a network request regardless of fetchPolicy and cache state
    disableNetworkRequestOptimization?: boolean; // Perform new network request instead of reusing the existing one
    respectLazy?: boolean;
    multiAbortSignal?: MultiAbortSignal;
}

export interface QueryPromiseData {
    promise: Promise<any>;
    callerAwaitStatuses: { [requesterId: string]: boolean };
    aborted: boolean;
    abort(): void;
    rerunNetworkRequest(): void;
}

export interface QueryProcessorOptions<C extends NonUndefined> {
    cache: Cache<C>;
    networkRequestQueue: NetworkRequestQueue<C>;
}

export class QueryProcessor<C extends NonUndefined> {
    private queries: { [requestId: string]: QueryPromiseData | undefined } = {};
    private isDataRefetchEnabled = false;
    private readonly cache: Cache<C>;
    private networkRequestQueue: NetworkRequestQueue<C>;

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

    public getSsrPromise<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requesterId: string,
    ): Promise<R | undefined> | undefined {
        const requestState = this.getCompleteRequestState(request, requesterId);

        if (
            !request.disableSsr &&
            !request.lazy &&
            typeof window === 'undefined' &&
            request.fetchPolicy !== 'cache-only' &&
            requestState.data === undefined &&
            requestState.error === undefined
        ) {
            return this.queryAfterPreparedLoadingState(request, {
                requesterId,
                forceNetworkRequest: false,
            });
        }

        return undefined;
    }

    public getCompleteRequestState<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requesterId: string,
    ): RequestState<R, E> {
        const requestId = request.getId(request.requestInit);

        return {
            loading: this.cache.getLoading(requestId),
            error: this.cache.getError(requestId),
            data: request.fromCache({
                cacheData: this.cache.getData(),
                requestInit: request.requestInit,
                requestId,
                requesterId,
            }),
        };
    }

    public async query<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requestOptions: QueryOptions,
    ): Promise<R | undefined> {
        this.prepareQueryLoadingState(request, requestOptions);

        return this.queryAfterPreparedLoadingState(request, requestOptions);
    }

    public prepareQueryLoadingState<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requestOptions: QueryOptions,
    ): void {
        const requestState = this.getCompleteRequestState(request, requestOptions.requesterId);
        const requestId = request.getId(request.requestInit);

        if (!this.shouldReturnOrThrowFromState(request, requestState, requestOptions) && !requestState.loading.length) {
            this.cache.updateState({
                requestStates: {
                    [requestId]: {
                        loading: [requestOptions.requesterId],
                    },
                },
                updateCacheData: cacheData =>
                    request.optimisticResponse
                        ? request.toCache({
                              cacheData,
                              data: request.optimisticResponse.optimisticData,
                              requestInit: request.requestInit,
                              requestId,
                              requesterId: requestOptions.requesterId,
                          })
                        : cacheData,
            });
        }
    }

    public async queryAfterPreparedLoadingState<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requestOptions: QueryOptions,
    ): Promise<R | undefined> {
        try {
            const requestState = this.getCompleteRequestState(request, requestOptions.requesterId);

            if (this.shouldReturnOrThrowFromState(request, requestState, requestOptions)) {
                return this.returnOrThrowRequestState(requestState);
            }

            return await this.getDataFromNetwork(request, requestOptions);
        } catch (error) {
            this.warnAboutDivergedError(error, request, requestOptions.requesterId);
            throw error;
        }
    }

    private async getDataFromNetwork<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        options: QueryOptions,
    ): Promise<R> {
        const { requesterId, multiAbortSignal } = options;

        const requestData = this.initQueryPromiseData(request, options);

        const onAbort = (multi?: boolean) => {
            requestData.callerAwaitStatuses[requesterId] = false;

            if (multi || Object.values(requestData.callerAwaitStatuses).every(status => !status)) {
                requestData.abort();
            } else {
                const requestId = request.getId(request.requestInit);

                this.cache.updateState({
                    requestStates: {
                        [requestId]: {
                            loading: Object.entries(requestData.callerAwaitStatuses)
                                .filter(([, isLoading]) => isLoading)
                                .map(([requesterId]) => requesterId),
                        },
                    },
                });
            }
        };

        wireAbortSignals(onAbort, multiAbortSignal);

        return await requestData.promise;
    }

    private initQueryPromiseData<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        { disableNetworkRequestOptimization, requesterId }: QueryOptions,
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
                callerAwaitStatuses: {
                    [requesterId]: true,
                },
                promise: Promise.resolve(),
            };

            requestPromiseData.promise = this.networkRequestQueue
                .getPromise(
                    request,
                    {
                        multiAbortSignal: multiAbortController.signal,
                        rerunSignal: rerunController.signal,
                    },
                    'query',
                )
                .then(data => {
                    if (this.queries[requestId] === requestPromiseData) {
                        this.queries[requestId] = undefined;

                        this.cache.updateState({
                            requestStates: {
                                [requestId]: {
                                    error: undefined,
                                    loading: [],
                                },
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
                            requestStates: {
                                [requestId]: {
                                    loading: [],
                                    error,
                                },
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

            this.queries[requestId] = requestPromiseData;
        } else {
            this.queries[requestId]!.callerAwaitStatuses[requesterId] = true;

            this.cache.updateState({
                requestStates: {
                    [requestId]: {
                        loading: Object.entries(this.queries[requestId]!.callerAwaitStatuses)
                            .filter(([, isLoading]) => isLoading)
                            .map(([requesterId]) => requesterId),
                    },
                },
            });

            if (disableNetworkRequestOptimization) {
                this.queries[requestId]!.rerunNetworkRequest();
            }
        }

        return this.queries[requestId] as QueryPromiseData;
    }

    private shouldReturnOrThrowFromState<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requestState: RequestState<R, E>,
        queryOptions: QueryOptions,
    ): boolean {
        return (
            queryOptions.forceNetworkRequest !== true &&
            ((queryOptions.respectLazy && request.lazy) ||
                request.fetchPolicy === 'cache-only' ||
                (request.fetchPolicy === 'cache-first' && this.isCachedDataSufficient(requestState)) ||
                (!request.disableInitialRenderDataRefetchOptimization &&
                    !this.isDataRefetchEnabled &&
                    this.isCachedDataSufficient(requestState)))
        );
    }

    private isCachedDataSufficient<R extends NonUndefined, E extends Error>(requestState: RequestState<R, E>): boolean {
        return requestState.data !== undefined;
    }

    private returnOrThrowRequestState<R extends NonUndefined, E extends Error>(requestState: RequestState<R, E>) {
        if (requestState.error !== undefined) {
            throw requestState.error;
        }

        return requestState.data;
    }

    private warnAboutDivergedError<R extends NonUndefined, E extends Error, I>(
        error: Error,
        request: YarfRequest<C, R, E, I>,
        requesterId: string,
    ) {
        if (process.env.NODE_ENV !== 'production') {
            const requestState = this.getCompleteRequestState(request, requesterId);
            if (error !== requestState.error) {
                logger.error(
                    "Error from state diverged from actual error. This likely indicates illegal exception in request's function. This can also indicate error in the library itself, so file an issue if request's functions are definitely correct.",
                );
                logger.error('State error:', requestState.error);
                logger.error('Actual error:', error);
            }
        }
    }
}
