import { MultiAbortController, wireAbortSignals } from '../promise';
import { RequestQueue } from './RequestQueue';
import { BaseRequestHelper } from './BaseRequestHelper';
import { NonUndefined, Cache, Mutation } from '../types';

export interface MutationPromiseData {
    promise: Promise<any>;
    aborted: boolean;
    abort(): void;
}

export interface MutationProcessorOptions<C extends NonUndefined> {
    cache: Cache<C>;
    networkRequestQueue: RequestQueue;
}

export class MutationProcessor<C extends NonUndefined> {
    private mutations: Set<MutationPromiseData> = new Set();
    private readonly cache: Cache<C>;
    private networkRequestQueue: RequestQueue;

    constructor({ cache, networkRequestQueue }: MutationProcessorOptions<C>) {
        this.cache = cache;
        this.networkRequestQueue = networkRequestQueue;
    }

    public purge() {
        this.mutations.forEach(mutation => mutation.abort());
        this.mutations.clear();
    }

    public mutate<R extends NonUndefined, E extends Error, I>(request: Mutation<C, R, E, I>): Promise<R> {
        const requestId = request.getRequestId(request.requestInit);
        const { abortSignal, requesterId } = request;

        if (request.optimisticData) {
            this.cache.updateState({
                updateCacheData: cacheData =>
                    request.toCache({
                        cacheData,
                        data: request.optimisticData!,
                        requestInit: request.requestInit,
                        requestId,
                        requesterId,
                    }),
            });
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
        wireAbortSignals(mutationPromiseData.abort, abortSignal);

        const mutationPromise = this.networkRequestQueue
            .addPromise(
                BaseRequestHelper.getPromiseFactory(request, { multiAbortSignal: multiAbortController.signal }),
                'mutation',
            )
            .then(data => {
                // Delay state update to let all planned state updates finish
                return data;
            })
            .then(data => {
                if (this.mutations.has(mutationPromiseData)) {
                    this.mutations.delete(mutationPromiseData);

                    this.cache.updateState({
                        updateCacheData: cacheData =>
                            request.toCache({
                                cacheData:
                                    request.optimisticData && request.removeOptimisticData
                                        ? request.removeOptimisticData({
                                              cacheData: cacheData,
                                              data: request.optimisticData,
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
                if (this.mutations.has(mutationPromiseData)) {
                    this.mutations.delete(mutationPromiseData);

                    if (request.optimisticData && request.removeOptimisticData) {
                        this.cache.updateState({
                            updateCacheData: cacheData =>
                                request.removeOptimisticData!({
                                    cacheData,
                                    data: request.optimisticData!,
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
}
