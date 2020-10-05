import { Cache, RequestState } from '../cache';
import {
    MultiAbortController,
    MultiAbortSignal,
    RerunController,
    smartPromise,
    Signals,
    wireAbortSignals,
} from '../promise';
import { RC, CC, EC, YarfRequest } from '../request';
import * as logger from '../logger';
import { SerializableCacheState } from '../cache/Cache';

interface ClientOptions {
    cache: Cache;
}

interface QueryOptions {
    callerId: string;
    forceNetworkRequest?: boolean; // Perform a network request regardless of fetchPolicy and cache state
    disableNetworkRequestOptimization?: boolean; // Perform new network request instead of reusing the existing one
    respectLazy?: boolean;
    multiAbortSignal?: MultiAbortSignal;
}

interface MutateOptions {
    callerId: string;
    multiAbortSignal?: MultiAbortSignal;
}

interface QueryPromiseData {
    promise: Promise<any>;
    callerAwaitStatuses: { [callerId: string]: boolean };
    aborted: boolean;
    abort(): void;
    rerunNetworkRequest(): void;
}

interface MutationPromiseData {
    promise: Promise<any>;
    aborted: boolean;
    abort(): void;
}

interface GetStateOptions {
    callerId: string;
}

class Client {
    private readonly cache: Cache;
    private queries: { [requestId: string]: QueryPromiseData | undefined } = {};
    private mutations: Set<MutationPromiseData> = new Set();
    private idCounter = 1;
    private isDataRefetchEnabled = false;

    constructor({ cache }: ClientOptions) {
        this.cache = cache;
    }

    public enableDataRefetch() {
        this.isDataRefetchEnabled = true;
    }

    public resetId() {
        this.idCounter = 1;
    }

    public generateId(): string {
        return String(this.idCounter++);
    }

    public extract() {
        return this.cache.getSerializableState();
    }

    public purge(initialSerializableState?: SerializableCacheState) {
        Object.values(this.queries).forEach(query => query?.abort());
        this.queries = {};

        this.mutations.forEach(mutation => mutation.abort());
        this.mutations.clear();

        this.cache.purge(initialSerializableState);
    }

    public subscribe<C extends CC, R extends RC, E extends EC, I>(
        request: YarfRequest<C, R, E, I>,
        callerId: string,
        onChange: (state: RequestState<R, E>) => void,
    ) {
        return this.cache.subscribe(() => {
            onChange(this.getState(request, { callerId }));
        });
    }

    public getState<C extends CC, R extends RC, E extends EC, I>(
        request: YarfRequest<C, R, E, I>,
        { callerId }: GetStateOptions,
    ): RequestState<R, E> {
        return this.getCompleteRequestState<R, E>(request, callerId);
    }

    public getSsrPromise<C extends CC, R extends RC, E extends EC, I>(
        request: YarfRequest<C, R, E, I>,
        callerId: string,
    ): Promise<R | undefined> | undefined {
        const requestState = this.getState(request, { callerId });

        if (
            !request.disableSsr &&
            !request.lazy &&
            typeof window === 'undefined' &&
            request.fetchPolicy !== 'cache-only' &&
            requestState.data === undefined &&
            requestState.error === undefined
        ) {
            return this.queryAfterPreparedLoadingState(request, { callerId, forceNetworkRequest: false });
        }

        return undefined;
    }

    public async mutate<C extends CC, R extends RC, E extends EC, I>(
        request: YarfRequest<C, R, E, I>,
        { multiAbortSignal, callerId }: MutateOptions,
    ): Promise<R> {
        const requestId = this.getRequestId(request);

        if (request.optimisticResponse !== undefined && request.clearCacheFromOptimisticResponse) {
            this.cache.onMutateStartWithOptimisticResponse(
                requestId,
                request.optimisticResponse,
                request.toCache?.(this.cache.getState().sharedData, request.optimisticResponse, request, callerId),
            );
        } else if (request.optimisticResponse !== undefined) {
            logger.warn(
                "Optimistic response for mutation won't work without clearCacheFromOptimisticResponse function",
            );
        }

        const multiAbortController = new MultiAbortController();

        const mutationPromiseData: MutationPromiseData = {
            promise: Promise.resolve(),
            abort() {
                multiAbortController.abort();
            },
            get aborted() {
                return Boolean(multiAbortController.signal.aborted);
            },
        };

        // eslint-disable-next-line @typescript-eslint/unbound-method
        wireAbortSignals(mutationPromiseData.abort, multiAbortSignal);

        const mutationPromise = this.getRequestPromise(request, { multiAbortSignal: multiAbortController.signal })
            .then(data => {
                if (this.mutations.has(mutationPromiseData) && !request.disableLoadingQueriesRefetchOptimization) {
                    Object.values(this.queries).forEach(promiseData => promiseData?.rerunNetworkRequest());
                }

                // Delay state update to let all planned state updates finish
                return data;
            })
            .then(data => {
                if (this.mutations.has(mutationPromiseData)) {
                    this.mutations.delete(mutationPromiseData);

                    let sharedData = this.cache.getState().sharedData;

                    if (request.optimisticResponse !== undefined && request.clearCacheFromOptimisticResponse) {
                        sharedData = request.clearCacheFromOptimisticResponse(
                            sharedData,
                            request.optimisticResponse,
                            request,
                        );
                    }

                    this.cache.onMutateSuccess(requestId, data, request.toCache?.(sharedData, data, request, callerId));

                    request.refetchQueries?.forEach(requestData => {
                        this.query(requestData, {
                            callerId: 'INTERNAL',
                            forceNetworkRequest: true,
                            disableNetworkRequestOptimization: true,
                        });
                    });
                }

                return data;
            })
            .catch(error => {
                if (this.mutations.has(mutationPromiseData)) {
                    this.mutations.delete(mutationPromiseData);

                    if (request.optimisticResponse !== undefined && request.clearCacheFromOptimisticResponse) {
                        const sharedData = this.cache.getState().sharedData;

                        this.cache.onQueryFailWithOptimisticResponse(
                            requestId,
                            error,
                            null, // Not cached anyway, can be any value
                            request.clearCacheFromOptimisticResponse(sharedData, request.optimisticResponse, request),
                        );
                    }
                }

                throw error;
            });

        mutationPromiseData.promise = mutationPromise;

        this.mutations.add(mutationPromiseData);

        return mutationPromise;
    }

    public async query<C extends CC, R extends RC, E extends EC, I>(
        request: YarfRequest<C, R, E, I>,
        requestOptions: QueryOptions,
    ): Promise<R | undefined> {
        this.prepareQueryLoadingState(request, requestOptions);

        return this.queryAfterPreparedLoadingState(request, requestOptions);
    }

    public prepareQueryLoadingState<C extends CC, R extends RC, E extends EC, I>(
        request: YarfRequest<C, R, E, I>,
        requestOptions: QueryOptions,
    ): void {
        const requestState = this.getCompleteRequestState<R, E>(request, requestOptions.callerId);
        const requestId = this.getRequestId(request);

        if (!this.shouldReturnOrThrowFromState(request, requestState, requestOptions) && !requestState.loading) {
            if (request.optimisticResponse !== undefined) {
                this.cache.onQueryStartWithOptimisticResponse(
                    requestId,
                    requestOptions.callerId,
                    request.optimisticResponse,
                    request.toCache?.(
                        this.cache.getState().sharedData,
                        request.optimisticResponse,
                        request,
                        requestOptions.callerId,
                    ),
                );
            } else {
                this.cache.onQueryStart(requestId, requestOptions.callerId);
            }
        }
    }

    public async queryAfterPreparedLoadingState<C extends CC, R extends RC, E extends EC, I>(
        request: YarfRequest<C, R, E, I>,
        requestOptions: QueryOptions,
    ): Promise<R | undefined> {
        try {
            const requestState = this.getCompleteRequestState<R, E>(request, requestOptions.callerId);

            if (this.shouldReturnOrThrowFromState(request, requestState, requestOptions)) {
                return this.returnOrThrowRequestState(requestState);
            }

            return await this.getDataFromNetwork(request, requestOptions);
        } catch (error) {
            this.warnAboutDivergedError(error, request, requestOptions);
            throw error;
        }
    }

    private getCompleteRequestState<D extends RC = any, E extends Error = Error>(
        request: YarfRequest,
        callerId: string,
    ): RequestState<D, E> {
        const defaultState = { loading: false, loadingRequesterIds: [], data: undefined, error: undefined };

        const rawState = this.cache.getState().requestStates[this.getRequestId(request)];

        let data = rawState?.data;
        if (request.fromCache) {
            data = request.fromCache(this.cache.getState().sharedData, request, callerId);
        }

        return { ...defaultState, ...rawState, data };
    }

    private async getDataFromNetwork<T>(request: YarfRequest, options: QueryOptions): Promise<T> {
        const { callerId, multiAbortSignal } = options;

        const requestData = this.initQueryPromiseData(request, options);

        const onAbort = (multi?: boolean) => {
            requestData.callerAwaitStatuses[callerId] = false;

            if (multi || Object.values(requestData.callerAwaitStatuses).every(status => !status)) {
                requestData.abort();
            } else {
                this.cache.onQueryRequesterRemove(this.getRequestId(request), callerId);
            }
        };

        wireAbortSignals(onAbort, multiAbortSignal);

        return await requestData.promise;
    }

    private initQueryPromiseData(
        request: YarfRequest,
        { disableNetworkRequestOptimization, callerId }: QueryOptions,
    ): QueryPromiseData {
        const requestId = this.getRequestId(request);

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
                    [callerId]: true,
                },
                promise: Promise.resolve(),
            };

            const nonOptimisticData = this.getCompleteRequestState(request, callerId).data;

            requestPromiseData.promise = this.getRequestPromise(request, {
                multiAbortSignal: multiAbortController.signal,
                rerunSignal: rerunController.signal,
            })
                .then(data => {
                    if (this.queries[requestId] === requestPromiseData) {
                        this.queries[requestId] = undefined;

                        let sharedData = this.cache.getState().sharedData;

                        if (request.optimisticResponse !== undefined && request.clearCacheFromOptimisticResponse) {
                            sharedData = request.clearCacheFromOptimisticResponse(
                                sharedData,
                                request.optimisticResponse,
                                request,
                            );
                        }

                        this.cache.onQuerySuccess(
                            requestId,
                            data,
                            request.toCache?.(sharedData, data, request, callerId),
                        );
                    }
                    return data;
                })
                .catch(error => {
                    if (this.queries[requestId] === requestPromiseData) {
                        this.queries[requestId] = undefined;

                        if (request.optimisticResponse !== undefined) {
                            const sharedData = this.cache.getState().sharedData;

                            this.cache.onQueryFailWithOptimisticResponse(
                                requestId,
                                error,
                                nonOptimisticData,
                                request.clearCacheFromOptimisticResponse
                                    ? request.clearCacheFromOptimisticResponse(
                                          sharedData,
                                          request.optimisticResponse,
                                          request,
                                      )
                                    : request.toCache?.(sharedData, nonOptimisticData, request, callerId),
                            );
                        } else {
                            this.cache.onQueryFail(requestId, error);
                        }
                    }
                    throw error;
                });

            this.queries[requestId] = requestPromiseData;
        } else {
            this.queries[requestId]!.callerAwaitStatuses[callerId] = true;

            this.cache.onQueryRequesterAdd(requestId, callerId);

            if (disableNetworkRequestOptimization) {
                this.queries[requestId]!.rerunNetworkRequest();
            }
        }

        return this.queries[requestId] as QueryPromiseData;
    }

    private getRequestId(request: YarfRequest) {
        return request.getId(request.requestInit);
    }

    private getRequestPromise(request: YarfRequest, signals: Signals = {}) {
        return smartPromise(request.getNetworkRequestFactory(request.requestInit), signals);
    }

    private shouldReturnOrThrowFromState(
        request: YarfRequest,
        requestState: RequestState,
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

    private isCachedDataSufficient(requestState: RequestState): boolean {
        return requestState.data !== undefined;
    }

    private returnOrThrowRequestState(requestState: RequestState) {
        if (requestState.error !== undefined) {
            throw requestState.error;
        }

        return requestState.data;
    }

    private warnAboutDivergedError<C extends CC, R extends RC, E extends EC, I>(
        error: Error,
        request: YarfRequest<C, R, E, I>,
        options: GetStateOptions,
    ) {
        if (process.env.NODE_ENV !== 'production') {
            const requestState = this.getState(request, options);
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

export { Client, ClientOptions };
