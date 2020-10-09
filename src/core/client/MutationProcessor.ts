import { NonUndefined, YarfRequest } from '../request';
import { MultiAbortController, MultiAbortSignal } from '../promise/controllers';
import { wireAbortSignals } from '../promise/helpers';
import { Cache } from '../cache';
import { NetworkRequestQueue } from './NetworkRequestQueue';

export interface MutateOptions {
    requesterId: string;
    multiAbortSignal?: MultiAbortSignal;
}

export interface MutationPromiseData {
    promise: Promise<any>;
    aborted: boolean;
    abort(): void;
}

export interface MutationProcessorOptions<C extends NonUndefined> {
    cache: Cache<C>;
    networkRequestQueue: NetworkRequestQueue<C>;
}

export class MutationProcessor<C extends NonUndefined> {
    private mutations: Set<MutationPromiseData> = new Set();
    private readonly cache: Cache<C>;
    private networkRequestQueue: NetworkRequestQueue<C>;

    constructor({ cache, networkRequestQueue }: MutationProcessorOptions<C>) {
        this.cache = cache;
        this.networkRequestQueue = networkRequestQueue;
    }

    public purge() {
        this.mutations.forEach(mutation => mutation.abort());
        this.mutations.clear();
    }

    public async mutate<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        { multiAbortSignal, requesterId }: MutateOptions,
    ): Promise<R> {
        const requestId = request.getId(request.requestInit);

        if (request.optimisticResponse) {
            this.cache.updateState({
                updateCacheData: cacheData =>
                    request.toCache({
                        cacheData,
                        data: request.optimisticResponse!.optimisticData,
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
        wireAbortSignals(mutationPromiseData.abort, multiAbortSignal);

        const mutationPromise = this.networkRequestQueue
            .getPromise(request, { multiAbortSignal: multiAbortController.signal }, 'mutation')
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
                if (this.mutations.has(mutationPromiseData)) {
                    this.mutations.delete(mutationPromiseData);

                    if (request.optimisticResponse) {
                        this.cache.updateState({
                            updateCacheData: cacheData =>
                                request.optimisticResponse!.removeOptimisticData({
                                    cacheData,
                                    optimisticData: request.optimisticResponse!.optimisticData,
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
