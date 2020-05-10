import { Cache, RequestState } from '../cache';
import {
    MultiAbortController,
    MultiAbortSignal,
    RerunController,
    smartPromise,
    Signals,
    wireAbortSignals,
} from '../promise';
import { GeneralRequestData, PartialRequestData, RequestData, BC, PPC, QPC, RC, SDC, EC, HC } from '../request';
import * as logger from '../logger';

interface ClientOptions {
    cache: Cache;
    generalRequestData: GeneralRequestData;
    fetch?: typeof fetch;
}

interface QueryOptions {
    callerId: string;
    forceNetworkRequest?: boolean;
    respectLazy?: boolean;
    multiAbortSignal?: MultiAbortSignal;
}

interface MutateOptions {
    callerId: string;
    multiAbortSignal?: MultiAbortSignal;
}

interface RequestPromiseData {
    promise: Promise<any>;
    callerAwaitStatuses: { [callerId: string]: boolean };
    aborted: boolean;
    abort(): void;
    rerunNetworkRequest(): void;
}

interface GetStateOptions {
    callerId: string;
    overrideWithInitialMountState?: boolean;
    overrideWithInitialUpdateState?: boolean;
}

class Client {
    private readonly cache: Cache;
    private readonly fetchFn?: typeof fetch;
    private readonly generalRequestData: GeneralRequestData;
    private requests: { [requestId: string]: RequestPromiseData | undefined } = {};
    private idCounter = 1;

    constructor({ cache, fetch: fetchFn, generalRequestData }: ClientOptions) {
        this.cache = cache;
        this.fetchFn = fetchFn;
        this.generalRequestData = generalRequestData;
    }

    public generateId(): string {
        return String(this.idCounter++);
    }

    public extract() {
        return this.cache.getSerializableState();
    }

    public getCompleteRequestData<
        C extends SDC,
        R extends RC,
        E extends EC,
        P extends PPC,
        Q extends QPC,
        B extends BC,
        H extends HC
    >(request: PartialRequestData<C, R, E, P, Q, B, H>): RequestData<C, R, E, P, Q, B, H> {
        if (request.merge) {
            return request.merge(this.generalRequestData, request);
        }

        return this.generalRequestData.merge(this.generalRequestData, request) as RequestData<C, R, E, P, Q, B, H>;
    }

    public subscribe<
        C extends SDC,
        R extends RC,
        E extends EC,
        P extends PPC,
        Q extends QPC,
        B extends BC,
        H extends HC
    >(
        request: PartialRequestData<C, R, E, P, Q, B, H>,
        callerId: string,
        onChange: (state: RequestState<R, E>) => void,
    ) {
        const mergedRequest = this.getCompleteRequestData(request);

        return this.cache.subscribe(() => {
            onChange(this.getState(mergedRequest, { callerId }));
        });
    }

    public getState<
        C extends SDC,
        R extends RC,
        E extends EC,
        P extends PPC,
        Q extends QPC,
        B extends BC,
        H extends HC
    >(
        request: PartialRequestData<C, R, E, P, Q, B, H>,
        { callerId, overrideWithInitialMountState, overrideWithInitialUpdateState }: GetStateOptions,
    ): RequestState<R, E> {
        const mergedRequest = this.getCompleteRequestData(request);
        const requestState = this.getCompleteRequestState<R, E>(mergedRequest, callerId);

        if (
            overrideWithInitialMountState &&
            !mergedRequest.lazy &&
            mergedRequest.fetchPolicy !== 'cache-only' &&
            !this.isCachedDataSufficient(requestState)
        ) {
            requestState.loading = true;
        }

        if (
            overrideWithInitialUpdateState &&
            !mergedRequest.lazy &&
            mergedRequest.fetchPolicy !== 'cache-only' &&
            !(mergedRequest.fetchPolicy === 'cache-first' && this.isCachedDataSufficient(requestState))
        ) {
            requestState.loading = true;
        }

        return requestState;
    }

    public getSsrPromise<
        C extends SDC,
        R extends RC,
        E extends EC,
        P extends PPC,
        Q extends QPC,
        B extends BC,
        H extends HC
    >(request: PartialRequestData<C, R, E, P, Q, B, H>, callerId: string): Promise<R | undefined> | undefined {
        const mergedRequest = this.getCompleteRequestData(request);

        const requestState = this.getState(mergedRequest, { callerId });

        if (
            !mergedRequest.lazy &&
            typeof window === 'undefined' &&
            !['no-cache', 'cache-only'].includes(mergedRequest.fetchPolicy) &&
            requestState.data === undefined &&
            requestState.error === undefined
        ) {
            return this.query(mergedRequest, { callerId, forceNetworkRequest: false });
        }

        return undefined;
    }

    public async mutate<
        C extends SDC,
        R extends RC,
        E extends EC,
        P extends PPC,
        Q extends QPC,
        B extends BC,
        H extends HC
    >(request: PartialRequestData<C, R, E, P, Q, B, H>, { multiAbortSignal, callerId }: MutateOptions): Promise<R> {
        const mergedRequest = this.getCompleteRequestData(request);
        const requestId = this.getRequestId(mergedRequest, callerId);

        if (mergedRequest.optimisticResponse !== undefined && mergedRequest.clearCacheFromOptimisticResponse) {
            this.cache.onMutateStartWithOptimisticResponse(
                requestId,
                mergedRequest.optimisticResponse,
                mergedRequest.fetchPolicy !== 'no-cache'
                    ? mergedRequest.toCache?.(
                          this.cache.getState().sharedData,
                          mergedRequest.optimisticResponse,
                          mergedRequest,
                      )
                    : undefined,
            );
        } else if (mergedRequest.optimisticResponse !== undefined) {
            logger.warn(
                "Optimistic response for mutation won't work without clearCacheFromOptimisticResponse function",
            );
        }

        return this.getRequestPromise(mergedRequest, { multiAbortSignal, abortSignal: mergedRequest.signal })
            .then(data => {
                if (mergedRequest.fetchPolicy !== 'no-cache' && mergedRequest.rerunLoadingQueriesAfterMutation) {
                    Object.values(this.requests).forEach(promiseData => promiseData?.rerunNetworkRequest());
                }

                // Delay state update to let all planned state updates finish
                return data;
            })
            .then(data => {
                let sharedData = this.cache.getState().sharedData;

                if (mergedRequest.optimisticResponse !== undefined && mergedRequest.clearCacheFromOptimisticResponse) {
                    sharedData = mergedRequest.clearCacheFromOptimisticResponse(
                        sharedData,
                        mergedRequest.optimisticResponse,
                        mergedRequest,
                    );
                }

                this.cache.onMutateSuccess(
                    requestId,
                    data,
                    mergedRequest.fetchPolicy !== 'no-cache'
                        ? mergedRequest.toCache?.(sharedData, data, mergedRequest)
                        : undefined,
                );

                return data;
            })
            .catch(error => {
                if (mergedRequest.optimisticResponse !== undefined && mergedRequest.clearCacheFromOptimisticResponse) {
                    const sharedData = this.cache.getState().sharedData;

                    this.cache.onQueryFailWithOptimisticResponse(
                        requestId,
                        error,
                        null, // Not cached anyway, can be any value
                        mergedRequest.fetchPolicy !== 'no-cache'
                            ? mergedRequest.clearCacheFromOptimisticResponse(
                                  sharedData,
                                  mergedRequest.optimisticResponse,
                                  mergedRequest,
                              )
                            : undefined,
                    );
                }
                throw error;
            });
    }

    // May reject with error that differs from the cached one. This generally implies a bug in external code
    public async query<
        C extends SDC,
        R extends RC,
        E extends EC,
        P extends PPC,
        Q extends QPC,
        B extends BC,
        H extends HC
    >(request: PartialRequestData<C, R, E, P, Q, B, H>, requestOptions: QueryOptions): Promise<R | undefined> {
        try {
            const mergedRequest = this.getCompleteRequestData(request);
            const requestState = this.getCompleteRequestState<R, E>(mergedRequest, requestOptions.callerId);

            if (requestOptions.respectLazy && mergedRequest.lazy) {
                return this.returnOrThrowRequestState(requestState);
            }

            if (mergedRequest.fetchPolicy === 'cache-only') {
                return this.returnOrThrowRequestState(requestState);
            }

            if (mergedRequest.fetchPolicy === 'cache-first' && this.isCachedDataSufficient(requestState)) {
                return this.returnOrThrowRequestState(requestState);
            }

            return this.getDataFromNetwork(mergedRequest, requestOptions);
        } catch (error) {
            this.warnAboutDivergedError(error, request, requestOptions);
            throw error;
        }
    }

    private getCompleteRequestState<D extends RC = any, E extends Error = Error>(
        mergedRequest: RequestData,
        callerId: string,
    ): RequestState<D, E> {
        const defaultState = { loading: false, data: undefined, error: undefined };

        const rawState = this.cache.getState().requestStates[this.getRequestId(mergedRequest, callerId)];

        let data = rawState?.data;
        if (mergedRequest.fromCache && mergedRequest.fetchPolicy !== 'no-cache') {
            data = mergedRequest.fromCache(this.cache.getState().sharedData, mergedRequest);
        }

        return { ...defaultState, ...rawState, data };
    }

    private async getDataFromNetwork<T>(mergedRequest: RequestData, options: QueryOptions): Promise<T> {
        const { callerId, multiAbortSignal } = options;

        const requestData = this.initRequestPromiseData(mergedRequest, options);

        const onAbort = (multi?: boolean) => {
            requestData.callerAwaitStatuses[callerId] = false;

            if (multi || Object.values(requestData.callerAwaitStatuses).every(status => !status)) {
                requestData.abort();
            }
        };

        wireAbortSignals(onAbort, mergedRequest.signal, multiAbortSignal);

        return await requestData.promise;
    }

    private initRequestPromiseData(
        mergedRequest: RequestData,
        { forceNetworkRequest, callerId }: QueryOptions,
    ): RequestPromiseData {
        const requestId = this.getRequestId(mergedRequest, callerId);

        if (!this.requests[requestId] || this.requests[requestId]?.aborted) {
            const multiAbortController = new MultiAbortController();
            const rerunController = new RerunController();

            const requestPromiseData: RequestPromiseData = {
                rerunNetworkRequest() {
                    rerunController.rerun();
                },
                abort() {
                    multiAbortController.abort();
                    this.aborted = true;
                },
                aborted: false,
                callerAwaitStatuses: {
                    [callerId]: true,
                },
                promise: Promise.resolve(),
            };

            const nonOptimisticData = this.getCompleteRequestState(mergedRequest, callerId).data;

            requestPromiseData.promise = this.getRequestPromise(mergedRequest, {
                multiAbortSignal: multiAbortController.signal,
                rerunSignal: rerunController.signal,
            })
                .then(data => {
                    if (this.requests[requestId] === requestPromiseData) {
                        this.requests[requestId] = undefined;

                        let sharedData = this.cache.getState().sharedData;

                        if (
                            mergedRequest.optimisticResponse !== undefined &&
                            mergedRequest.clearCacheFromOptimisticResponse
                        ) {
                            sharedData = mergedRequest.clearCacheFromOptimisticResponse(
                                sharedData,
                                mergedRequest.optimisticResponse,
                                mergedRequest,
                            );
                        }

                        this.cache.onQuerySuccess(
                            requestId,
                            data,
                            mergedRequest.fetchPolicy !== 'no-cache'
                                ? mergedRequest.toCache?.(sharedData, data, mergedRequest)
                                : undefined,
                        );
                    }
                    return data;
                })
                .catch(error => {
                    if (this.requests[requestId] === requestPromiseData) {
                        this.requests[requestId] = undefined;

                        if (mergedRequest.optimisticResponse !== undefined) {
                            const sharedData = this.cache.getState().sharedData;

                            this.cache.onQueryFailWithOptimisticResponse(
                                requestId,
                                error,
                                nonOptimisticData,
                                mergedRequest.fetchPolicy !== 'no-cache'
                                    ? mergedRequest.clearCacheFromOptimisticResponse
                                        ? mergedRequest.clearCacheFromOptimisticResponse(
                                              sharedData,
                                              mergedRequest.optimisticResponse,
                                              mergedRequest,
                                          )
                                        : mergedRequest.toCache?.(sharedData, nonOptimisticData, mergedRequest)
                                    : undefined,
                            );
                        } else {
                            this.cache.onQueryFail(requestId, error);
                        }
                    }
                    throw error;
                });

            this.requests[requestId] = requestPromiseData;

            if (mergedRequest.optimisticResponse !== undefined) {
                this.cache.onQueryStartWithOptimisticResponse(
                    requestId,
                    mergedRequest.optimisticResponse,
                    mergedRequest.fetchPolicy !== 'no-cache'
                        ? mergedRequest.toCache?.(
                              this.cache.getState().sharedData,
                              mergedRequest.optimisticResponse,
                              mergedRequest,
                          )
                        : undefined,
                );
            } else {
                this.cache.onQueryStart(requestId);
            }
        } else {
            this.requests[requestId]!.callerAwaitStatuses[callerId] = true;
            if (forceNetworkRequest) {
                this.requests[requestId]!.rerunNetworkRequest();
            }
        }

        return this.requests[requestId] as RequestPromiseData;
    }

    private getRequestId(mergedRequest: RequestData, callerId: string) {
        const pureId = mergedRequest.getId(mergedRequest);

        if (mergedRequest.fetchPolicy === 'no-cache') {
            return `no-cache:${callerId}:${pureId}`;
        }

        return pureId;
    }

    private getRequestPromise(mergedRequest: RequestData, signals: Signals = {}) {
        return smartPromise(
            signal =>
                (this.fetchFn || fetch)(mergedRequest.getUrl(mergedRequest), { ...mergedRequest, signal }).then(
                    // It's pure function
                    // eslint-disable-next-line @typescript-eslint/unbound-method
                    mergedRequest.processResponse,
                ),
            signals,
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

    private warnAboutDivergedError<
        C extends SDC,
        R extends RC,
        E extends EC,
        P extends PPC,
        Q extends QPC,
        B extends BC,
        H extends HC
    >(error: Error, request: PartialRequestData<C, R, E, P, Q, B, H>, options: GetStateOptions) {
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
