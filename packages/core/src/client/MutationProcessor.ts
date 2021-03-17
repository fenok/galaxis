import { wireAbortSignals, getAbortController } from '../promise';
import { RequestQueue } from './RequestQueue';
import { BaseRequestHelper } from './BaseRequestHelper';
import { NonUndefined, Cache, BaseMutation } from '../types';

export interface MutationRequest {
    promise: Promise<unknown>;
    aborted: boolean;
    abort(): void;
}

export interface MutationProcessorOptions<C extends NonUndefined> {
    cache: Cache<C>;
    networkRequestQueue: RequestQueue;
}

export class MutationProcessor<C extends NonUndefined> {
    private ongoingRequests: Set<MutationRequest> = new Set();
    private readonly cache: Cache<C>;
    private readonly requestQueue: RequestQueue;

    constructor({ cache, networkRequestQueue }: MutationProcessorOptions<C>) {
        this.cache = cache;
        this.requestQueue = networkRequestQueue;
    }

    public purge() {
        this.ongoingRequests.forEach((mutation) => mutation.abort());
        this.ongoingRequests.clear();
    }

    public mutate<D extends NonUndefined, E extends Error, R>(mutation: BaseMutation<C, D, E, R>): Promise<D> {
        const requestId = mutation.getRequestId(mutation);

        if (mutation.optimisticData && mutation.toCache) {
            this.cache.updateState({
                data: mutation.toCache({
                    cacheData: this.cache.getCacheData(),
                    data: mutation.optimisticData!,
                    requestParams: mutation.requestParams,
                    requestId,
                }),
            });
        }

        const abortController = getAbortController();

        const mutationRequest: MutationRequest = {
            promise: this.requestQueue
                .addPromise(
                    BaseRequestHelper.getPromiseFactory(mutation, { abortSignal: abortController?.signal }),
                    'mutation',
                )
                .then((data) => {
                    if (this.ongoingRequests.has(mutationRequest)) {
                        this.ongoingRequests.delete(mutationRequest);

                        if (mutation.toCache) {
                            this.cache.updateState({
                                data: mutation.toCache({
                                    cacheData:
                                        mutation.optimisticData && mutation.removeOptimisticData
                                            ? mutation.removeOptimisticData({
                                                  cacheData: this.cache.getCacheData(),
                                                  data: mutation.optimisticData,
                                                  requestParams: mutation.requestParams,
                                                  requestId,
                                              })
                                            : this.cache.getCacheData(),
                                    data,
                                    requestParams: mutation.requestParams,
                                    requestId,
                                }),
                            });
                        }
                    }

                    return data;
                })
                .catch((error) => {
                    if (this.ongoingRequests.has(mutationRequest)) {
                        this.ongoingRequests.delete(mutationRequest);

                        if (mutation.optimisticData && mutation.removeOptimisticData) {
                            this.cache.updateState({
                                data: mutation.removeOptimisticData({
                                    cacheData: this.cache.getCacheData(),
                                    data: mutation.optimisticData!,
                                    requestParams: mutation.requestParams,
                                    requestId,
                                }),
                            });
                        }
                    }

                    throw error;
                }),
            abort() {
                abortController?.abort();
            },
            get aborted() {
                return Boolean(abortController?.signal.aborted);
            },
        };

        // eslint-disable-next-line @typescript-eslint/unbound-method
        wireAbortSignals(mutationRequest.abort, mutation.abortSignal);

        this.ongoingRequests.add(mutationRequest);

        return mutationRequest.promise as Promise<D>;
    }
}
