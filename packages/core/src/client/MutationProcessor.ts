import { wireAbortSignals, getAbortController } from '../promise';
import { RequestQueue } from './RequestQueue';
import { RequestHelper } from './RequestHelper';
import { NonUndefined, Cache, Mutation, Resource } from '../types';

export interface MutationRequest {
    promise: Promise<unknown>;
    aborted: boolean;
    abort: () => void;
}

export interface MutationProcessorOptions<C extends NonUndefined> {
    cache: Cache<C>;
    requestQueue: RequestQueue;
    hash(value: unknown): string;
}

export class MutationProcessor<C extends NonUndefined> {
    private ongoingRequests: Set<MutationRequest> = new Set();
    private readonly cache: Cache<C>;
    private readonly requestQueue: RequestQueue;
    private hash: (value: unknown) => string;

    constructor({ cache, requestQueue, hash }: MutationProcessorOptions<C>) {
        this.cache = cache;
        this.requestQueue = requestQueue;
        this.hash = hash;
    }

    public onReset() {
        this.ongoingRequests.forEach((mutation) => mutation.abort());
        this.ongoingRequests.clear();
    }

    public mutate<D extends NonUndefined, E extends Error, R extends Resource>(
        mutation: Mutation<C, D, E, R>,
    ): Promise<D> {
        const requestId = mutation.requestId ? mutation.requestId(mutation.resource) : this.hash(mutation.resource);

        if (mutation.optimisticData && mutation.toCache && mutation.fetchPolicy !== 'no-cache') {
            this.cache.update({
                data: mutation.toCache({
                    cacheData: this.cache.getData(),
                    data: mutation.optimisticData!,
                    resource: mutation.resource,
                    requestId,
                }),
            });
        }

        const abortController = getAbortController();

        const mutationRequest: MutationRequest = {
            promise: this.requestQueue
                .addPromise(
                    RequestHelper.getPromiseFactory(mutation, { abortSignal: abortController?.signal }),
                    'mutation',
                )
                .then((data) => {
                    if (this.ongoingRequests.has(mutationRequest)) {
                        this.ongoingRequests.delete(mutationRequest);

                        if (mutation.toCache && mutation.fetchPolicy !== 'no-cache') {
                            this.cache.update({
                                data: mutation.toCache({
                                    cacheData:
                                        mutation.optimisticData && mutation.removeOptimisticData
                                            ? mutation.removeOptimisticData({
                                                  cacheData: this.cache.getData(),
                                                  data: mutation.optimisticData,
                                                  resource: mutation.resource,
                                                  requestId,
                                              })
                                            : this.cache.getData(),
                                    data,
                                    resource: mutation.resource,
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

                        if (
                            mutation.optimisticData &&
                            mutation.removeOptimisticData &&
                            mutation.fetchPolicy !== 'no-cache'
                        ) {
                            this.cache.update({
                                data: mutation.removeOptimisticData({
                                    cacheData: this.cache.getData(),
                                    data: mutation.optimisticData!,
                                    resource: mutation.resource,
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

        wireAbortSignals(mutationRequest.abort, mutation.abortSignal);

        this.ongoingRequests.add(mutationRequest);

        return mutationRequest.promise as Promise<D>;
    }
}
