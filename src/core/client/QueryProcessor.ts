import { MultiAbortController, RerunController, wireAbortSignals } from '../promise';
import { RequestState } from './Client';
import { NetworkRequestQueue } from './NetworkRequestQueue';
import { BaseRequestHelper } from './BaseRequestHelper';
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
    private ongoingNetworkRequests: { [requestId: string]: QueryNetworkRequest | undefined } = {};
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
        Object.values(this.ongoingNetworkRequests).forEach(query => query?.abort());
        this.ongoingNetworkRequests = {};
    }

    public getQueryState<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
    ): RequestState<R, E> {
        const requestId = request.getRequestId(request.requestInit);
        const { loading, error } = this.cache.getRequestState(requestId);

        return {
            loading,
            error,
            data: request.fromCache({
                cacheData: this.cache.getCacheData(),
                ...this.getCommonCacheOptions(request, requestId),
            }),
        };
    }

    public query<R extends NonUndefined, E extends Error, I>(request: QueryInit<C, R, E, I>): QueryResult<R, E> {
        const requestId = request.getRequestId(request.requestInit);
        const requestState = this.getQueryState(request);

        return {
            fromCache: requestState,
            fromNetwork: this.getNetworkRequestPromise(request, requestId, requestState),
        };
    }

    private getNetworkRequestPromise<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
        requestId: string,
        requestState: RequestState<R, E>,
    ): Promise<R> | undefined {
        const isNetworkRequestRequired = this.isNetworkRequestRequired(request, requestId, requestState);

        if (isNetworkRequestRequired) {
            const networkRequest = this.ensureQueryNetworkRequest(request, requestId, requestState);

            const onAbort = (multi?: boolean) => {
                networkRequest.loading.delete(request.requesterId);

                if (multi || networkRequest.loading.size === 0) {
                    networkRequest.abort();
                } else {
                    this.updateCache(request, requestId, { type: 'loading' });
                }
            };

            wireAbortSignals(onAbort, request.abortSignal);

            return networkRequest.promise;
        }

        this.updateCache(request, requestId, { type: 'loading' });

        return undefined;
    }

    private ensureQueryNetworkRequest<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
        requestId: string,
        requestState: RequestState<R, E>,
    ): QueryNetworkRequest {
        const currentNetworkRequest = this.ongoingNetworkRequests[requestId];

        if (!currentNetworkRequest || currentNetworkRequest.aborted) {
            const multiAbortController = new MultiAbortController();
            const rerunController = new RerunController();

            const networkRequest: QueryNetworkRequest = {
                rerun() {
                    rerunController.rerun();
                },
                abort() {
                    multiAbortController.abort();
                },
                get aborted() {
                    return Boolean(multiAbortController.signal.aborted);
                },
                loading: new Set([request.requesterId]),
            };

            if (this.isNetworkRequestAllowed(request, requestState)) {
                networkRequest.promise = this.networkRequestQueue
                    .addPromise(
                        BaseRequestHelper.getPromiseFactory(request, {
                            multiAbortSignal: multiAbortController.signal,
                            rerunSignal: rerunController.signal,
                        }),
                        'query',
                    )
                    .then(data => {
                        if (this.ongoingNetworkRequests[requestId] === networkRequest) {
                            this.ongoingNetworkRequests[requestId] = undefined;

                            this.updateCache(request, requestId, { type: 'success', data });
                        }
                        return data;
                    })
                    .catch(error => {
                        if (this.ongoingNetworkRequests[requestId] === networkRequest) {
                            this.ongoingNetworkRequests[requestId] = undefined;

                            this.updateCache(request, requestId, { type: 'fail', error });
                        }
                        throw error;
                    });
            }

            this.ongoingNetworkRequests[requestId] = networkRequest;

            this.updateCache(request, requestId, { type: 'start' });
        } else {
            currentNetworkRequest.loading.add(request.requesterId);

            this.updateCache(request, requestId, { type: 'loading' });

            if (request.rerunExistingNetworkRequest) {
                currentNetworkRequest.rerun();
            }
        }

        return this.ongoingNetworkRequests[requestId]!;
    }

    private updateCache<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
        requestId: string,
        action: { type: 'loading' } | { type: 'start' } | { type: 'fail'; error: E } | { type: 'success'; data: R },
    ) {
        this.cache.updateState({
            updateRequestState: {
                requestId,
                update: ({ error }) => ({
                    error: action.type !== 'fail' ? (action.type !== 'success' ? error : undefined) : action.error,
                    loading: [...(this.ongoingNetworkRequests[requestId]?.loading ?? [])],
                }),
            },
            updateCacheData:
                action.type !== 'loading'
                    ? cacheData => {
                          if (action.type === 'start') {
                              return request.optimisticResponse
                                  ? request.toCache({
                                        cacheData,
                                        data: request.optimisticResponse.optimisticData,
                                        ...this.getCommonCacheOptions(request, requestId),
                                    })
                                  : cacheData;
                          } else if (action.type === 'fail') {
                              return request.optimisticResponse
                                  ? request.optimisticResponse.removeOptimisticData({
                                        cacheData,
                                        data: request.optimisticResponse.optimisticData,
                                        ...this.getCommonCacheOptions(request, requestId),
                                    })
                                  : cacheData;
                          } else {
                              return request.toCache({
                                  cacheData: request.optimisticResponse
                                      ? request.optimisticResponse.removeOptimisticData({
                                            cacheData: cacheData,
                                            data: request.optimisticResponse.optimisticData,
                                            ...this.getCommonCacheOptions(request, requestId),
                                        })
                                      : cacheData,
                                  data: action.data,
                                  ...this.getCommonCacheOptions(request, requestId),
                              });
                          }
                      }
                    : undefined,
        });
    }

    private isNetworkRequestRequired<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
        requestId: string,
        requestState: RequestState<R, E>,
    ): boolean {
        return !(
            request.fetchPolicy === 'cache-only' ||
            (request.fetchPolicy === 'cache-first' &&
                this.isRequestStateSufficient(request, requestId, requestState)) ||
            (request.preventExcessNetworkRequestOnHydrate &&
                this.isHydrate &&
                this.isRequestStateSufficient(request, requestId, requestState))
        );
    }

    private isNetworkRequestAllowed<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
        requestState: RequestState<R, E>,
    ): boolean {
        return (
            typeof window !== 'undefined' ||
            (!request.disableSsr && requestState.data === undefined && requestState.error === undefined)
        );
    }

    private isRequestStateSufficient<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
        requestId: string,
        requestState: RequestState<R, E>,
    ): boolean {
        return (
            requestState.data !== undefined &&
            (!request.optimisticResponse ||
                !request.optimisticResponse.isOptimisticData({
                    data: requestState.data,
                    cacheData: this.cache.getCacheData(),
                    ...this.getCommonCacheOptions(request, requestId),
                }))
        );
    }

    private getCommonCacheOptions<R extends NonUndefined, E extends Error, I>(
        request: QueryInit<C, R, E, I>,
        requestId: string,
    ) {
        return {
            requestInit: request.requestInit,
            requestId,
            requesterId: request.requesterId,
        };
    }
}
