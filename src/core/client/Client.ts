import { Cache, RequestState } from '../cache';
import {
    MultiAbortController,
    MultiAbortSignal,
    RerunController,
    smartPromise,
    Signals,
    wireAbortSignals,
} from '../promise';
import { NonUndefined, YarfRequest } from '../request';
import * as logger from '../logger';
import { SerializableCacheState } from '../cache/Cache';

interface ClientOptions<C extends NonUndefined = null> {
    cache: Cache<C>;
}

interface QueryOptions {
    requesterId: string;
    forceNetworkRequest?: boolean; // Perform a network request regardless of fetchPolicy and cache state
    disableNetworkRequestOptimization?: boolean; // Perform new network request instead of reusing the existing one
    respectLazy?: boolean;
    multiAbortSignal?: MultiAbortSignal;
}

interface MutateOptions {
    requesterId: string;
    multiAbortSignal?: MultiAbortSignal;
}

interface QueryPromiseData {
    promise: Promise<any>;
    callerAwaitStatuses: { [requesterId: string]: boolean };
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
    requesterId: string;
}

class Client<C extends NonUndefined = null> {
    private readonly cache: Cache<C>;
    private queries: { [requestId: string]: QueryPromiseData | undefined } = {};
    private mutations: Set<MutationPromiseData> = new Set();
    private idCounter = 1;
    private isDataRefetchEnabled = false;

    constructor({ cache }: ClientOptions<C>) {
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

    public purge(initialSerializableState?: SerializableCacheState<C>) {
        Object.values(this.queries).forEach(query => query?.abort());
        this.queries = {};

        this.mutations.forEach(mutation => mutation.abort());
        this.mutations.clear();

        this.cache.purge(initialSerializableState);
    }

    public subscribe<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requesterId: string,
        onChange: (state: RequestState<R, E>) => void,
    ) {
        return this.cache.subscribe(() => {
            onChange(this.getState(request, { requesterId }));
        });
    }

    public getState<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        { requesterId }: GetStateOptions,
    ): RequestState<R, E> {
        return this.getCompleteRequestState(request, requesterId);
    }

    public getSsrPromise<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requesterId: string,
    ): Promise<R | undefined> | undefined {
        const requestState = this.getState(request, { requesterId });

        if (
            !request.disableSsr &&
            !request.lazy &&
            typeof window === 'undefined' &&
            request.fetchPolicy !== 'cache-only' &&
            requestState.data === undefined &&
            requestState.error === undefined
        ) {
            return this.queryAfterPreparedLoadingState(request, { requesterId, forceNetworkRequest: false });
        }

        return undefined;
    }

    public async mutate<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        { multiAbortSignal, requesterId }: MutateOptions,
    ): Promise<R> {
        const requestId = this.getRequestId(request);

        if (request.optimisticResponse !== undefined && request.clearCacheFromOptimisticResponse) {
            this.cache.onMutateStart({
                cacheData: request.toCache({
                    cacheData: this.cache.getState().data,
                    responseData: request.optimisticResponse,
                    requestInit: request.requestInit,
                    requestId,
                    requesterId,
                }),
            });
        } else if (request.optimisticResponse !== undefined) {
            logger.warn("Optimistic response won't work without clearCacheFromOptimisticResponse function");
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

                    let cacheData = this.cache.getState().data;

                    if (request.optimisticResponse !== undefined && request.clearCacheFromOptimisticResponse) {
                        cacheData = request.clearCacheFromOptimisticResponse({
                            cacheData: cacheData,
                            optimisticResponseData: request.optimisticResponse,
                            requestInit: request.requestInit,
                            requestId,
                            requesterId,
                        });
                    }

                    this.cache.onMutateSuccess({ cacheData });

                    request.refetchQueries?.forEach(requestData => {
                        this.query(requestData, {
                            requesterId: 'INTERNAL',
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
                        const cacheData = this.cache.getState().data;

                        this.cache.onMutateFail({
                            cacheData: request.clearCacheFromOptimisticResponse({
                                cacheData: cacheData,
                                optimisticResponseData: request.optimisticResponse,
                                requestInit: request.requestInit,
                                requestId,
                                requesterId,
                            }),
                        });
                    }
                }

                throw error;
            });

        mutationPromiseData.promise = mutationPromise;

        this.mutations.add(mutationPromiseData);

        return mutationPromise;
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
        const requestId = this.getRequestId(request);

        if (!this.shouldReturnOrThrowFromState(request, requestState, requestOptions) && !requestState.loading.length) {
            this.cache.onQueryStart({
                requestId,
                requesterId: requestOptions.requesterId,
                cacheData:
                    request.optimisticResponse && request.clearCacheFromOptimisticResponse
                        ? request.toCache({
                              cacheData: this.cache.getState().data,
                              responseData: request.optimisticResponse,
                              requestInit: request.requestInit,
                              requestId,
                              requesterId: requestOptions.requesterId,
                          })
                        : undefined,
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
            this.warnAboutDivergedError(error, request, requestOptions);
            throw error;
        }
    }

    private getCompleteRequestState<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requesterId: string,
    ): RequestState<R, E> {
        const currentState = this.cache.getState();
        const requestId = this.getRequestId(request);

        return {
            loading: currentState.loading[requestId] ?? [],
            data: request.fromCache({
                cacheData: currentState.data,
                requestInit: request.requestInit,
                requestId,
                requesterId,
            }),
        };
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
                this.cache.onQueryRequesterRemove({ requestId: this.getRequestId(request), requesterId });
            }
        };

        wireAbortSignals(onAbort, multiAbortSignal);

        return await requestData.promise;
    }

    private initQueryPromiseData<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        { disableNetworkRequestOptimization, requesterId }: QueryOptions,
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
                    [requesterId]: true,
                },
                promise: Promise.resolve(),
            };

            requestPromiseData.promise = this.getRequestPromise(request, {
                multiAbortSignal: multiAbortController.signal,
                rerunSignal: rerunController.signal,
            })
                .then(data => {
                    if (this.queries[requestId] === requestPromiseData) {
                        this.queries[requestId] = undefined;

                        let cacheData = this.cache.getState().data;

                        if (request.optimisticResponse !== undefined && request.clearCacheFromOptimisticResponse) {
                            cacheData = request.clearCacheFromOptimisticResponse({
                                cacheData: cacheData,
                                optimisticResponseData: request.optimisticResponse,
                                requestInit: request.requestInit,
                                requestId,
                                requesterId,
                            });
                        }

                        this.cache.onQuerySuccess({
                            requestId,
                            requesterId,
                            cacheData: request.toCache({
                                cacheData: cacheData,
                                responseData: data,
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

                        const cacheData = this.cache.getState().data;

                        this.cache.onQueryFail({
                            requestId,
                            requesterId,
                            error,
                            cacheData:
                                request.optimisticResponse && request.clearCacheFromOptimisticResponse
                                    ? request.clearCacheFromOptimisticResponse({
                                          cacheData: cacheData,
                                          optimisticResponseData: request.optimisticResponse,
                                          requestInit: request.requestInit,
                                          requestId,
                                          requesterId,
                                      })
                                    : undefined,
                        });
                    }
                    throw error;
                });

            this.queries[requestId] = requestPromiseData;
        } else {
            this.queries[requestId]!.callerAwaitStatuses[requesterId] = true;

            this.cache.onQueryRequesterAdd({ requestId, requesterId });

            if (disableNetworkRequestOptimization) {
                this.queries[requestId]!.rerunNetworkRequest();
            }
        }

        return this.queries[requestId] as QueryPromiseData;
    }

    private getRequestId<R extends NonUndefined, E extends Error, I>(request: YarfRequest<C, R, E, I>) {
        return request.getId(request.requestInit);
    }

    private getRequestPromise<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        signals: Signals = {},
    ): Promise<R> {
        return smartPromise(request.getNetworkRequestFactory(request.requestInit), signals).then(dataOrError => {
            if (dataOrError instanceof Error) {
                logger.warn(
                    'Network request promise was resolved with error. You should reject the promise instead. Error: ',
                    dataOrError,
                );
                throw dataOrError;
            } else {
                return dataOrError;
            }
        });
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
