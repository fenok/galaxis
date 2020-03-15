import { Cache, RequestState } from '../cache';
import { MultiAbortController, MultiAbortSignal, RerunController } from '../promise';
import { smartPromise, Signals, wireAbortSignals } from '../promise';
import { GeneralRequestData, PartialRequestData, RequestData } from '../request';
import { BC, PPC, QPC, RC, SDC, EC } from '../request/types';

interface ClientOptions {
    cache: Cache;
    generalRequestData: GeneralRequestData;
    fetch?: typeof fetch;
}

interface QueryOptions {
    callerId: string;
    forceNetworkRequest?: boolean;
    multiAbortSignal?: MultiAbortSignal;
}

interface MutateOptions {
    callerId: string;
    multiAbortSignal?: MultiAbortSignal;
}

interface RequestPromiseData {
    promise: Promise<any>;
    callerAwaitStatuses: { [callerId: string]: boolean };
    abort(): void;
    rerunNetworkRequest(): void;
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
        B extends BC
    >(request: PartialRequestData<C, R, E, P, Q, B>): RequestData<C, R, E, P, Q, B> {
        if (request.merge) {
            return request.merge(this.generalRequestData, request);
        }

        return this.generalRequestData.merge(this.generalRequestData, request) as RequestData<C, R, E, P, Q, B>;
    }

    public subscribe<C extends SDC, R extends RC, E extends EC, P extends PPC, Q extends QPC, B extends BC>(
        request: PartialRequestData<C, R, E, P, Q, B>,
        callerId: string,
        onChange: (state: RequestState<R, E>) => void,
    ) {
        const mergedRequest = this.getCompleteRequestData(request);

        return this.cache.subscribe(() => {
            onChange(this.getState(mergedRequest, callerId));
        });
    }

    public getState<C extends SDC, R extends RC, E extends EC, P extends PPC, Q extends QPC, B extends BC>(
        request: PartialRequestData<C, R, E, P, Q, B>,
        callerId: string,
    ): RequestState<R, E> {
        const mergedRequest = this.getCompleteRequestData(request);

        const data = this.getDataFromCache<R>(mergedRequest, callerId);
        const requestState = this.cache.getState().requestStates[this.getRequestId(mergedRequest, callerId)];

        const initialState = { loading: false, data: data, error: undefined };

        if (
            mergedRequest.fetchPolicy === 'no-cache' ||
            (mergedRequest.fetchPolicy !== 'cache-only' && data === undefined)
        ) {
            initialState.loading = true;
        }

        return { ...initialState, ...requestState, data };
    }

    public getSsrPromise<C extends SDC, R extends RC, E extends EC, P extends PPC, Q extends QPC, B extends BC>(
        request: PartialRequestData<C, R, E, P, Q, B>,
        callerId: string,
    ): Promise<R | undefined> | undefined {
        const mergedRequest = this.getCompleteRequestData(request);

        const requestState = this.getState(mergedRequest, callerId);

        if (
            typeof window === 'undefined' &&
            !['no-cache', 'cache-only'].includes(mergedRequest.fetchPolicy) &&
            requestState.data === undefined &&
            requestState.error === undefined
        ) {
            return this.query(mergedRequest, { callerId, forceNetworkRequest: false });
        }

        return undefined;
    }

    public async mutate<C extends SDC, R extends RC, E extends EC, P extends PPC, Q extends QPC, B extends BC>(
        request: PartialRequestData<C, R, E, P, Q, B>,
        { multiAbortSignal, callerId }: MutateOptions,
    ): Promise<R> {
        const mergedRequest = this.getCompleteRequestData(request);

        return this.getRequestPromise(mergedRequest, { multiAbortSignal, abortSignal: mergedRequest.signal })
            .then(data => {
                if (mergedRequest.fetchPolicy !== 'no-cache') {
                    Object.values(this.requests).forEach(promiseData => promiseData?.rerunNetworkRequest());
                }

                // Delay state update to let all planned state updates finish
                return data;
            })
            .then(data => {
                this.cache.onMutateSuccess(
                    this.getRequestId(mergedRequest, callerId),
                    data,
                    mergedRequest.fetchPolicy !== 'no-cache'
                        ? mergedRequest.toCache?.(this.cache.getState().sharedData, data, mergedRequest)
                        : undefined,
                );

                return data;
            });
    }

    // May reject with error that differs from the cached one. This generally implies a bug in external code
    public async query<C extends SDC, R extends RC, E extends EC, P extends PPC, Q extends QPC, B extends BC>(
        request: PartialRequestData<C, R, E, P, Q, B>,
        requestOptions: QueryOptions,
    ): Promise<R | undefined> {
        const mergedRequest = this.getCompleteRequestData(request);

        const cachedData = this.getDataFromCache<R>(mergedRequest, requestOptions.callerId);

        if (mergedRequest.fetchPolicy === 'cache-only') {
            return cachedData;
        }

        if (mergedRequest.fetchPolicy === 'cache-first' && cachedData !== undefined) {
            return cachedData;
        }

        return this.getDataFromNetwork(mergedRequest, requestOptions);
    }

    private getDataFromCache<T>(mergedRequest: RequestData, callerId: string): T | undefined {
        if (mergedRequest.fromCache && mergedRequest.fetchPolicy !== 'no-cache') {
            return mergedRequest.fromCache(this.cache.getState().sharedData, mergedRequest);
        }

        return this.cache.getState().requestStates[this.getRequestId(mergedRequest, callerId)]?.data;
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

        if (!this.requests[requestId]) {
            const multiAbortController = new MultiAbortController();
            const rerunController = new RerunController();

            const promise = this.getRequestPromise(mergedRequest, {
                multiAbortSignal: multiAbortController.signal,
                rerunSignal: rerunController.signal,
            });

            this.requests[requestId] = {
                rerunNetworkRequest() {
                    rerunController.rerun();
                },
                abort() {
                    multiAbortController.abort();
                },
                callerAwaitStatuses: {
                    [callerId]: true,
                },
                promise: promise
                    .then(data => {
                        this.requests[requestId] = undefined;
                        this.cache.onQuerySuccess(
                            requestId,
                            data,
                            mergedRequest.fetchPolicy !== 'no-cache'
                                ? mergedRequest.toCache?.(this.cache.getState().sharedData, data, mergedRequest)
                                : undefined,
                        );
                        return data;
                    })
                    .catch(error => {
                        this.requests[requestId] = undefined;
                        this.cache.onQueryFail(requestId, error);
                        throw error;
                    }),
            };

            this.cache.onQueryStart(requestId);
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
}

export { Client, ClientOptions };
