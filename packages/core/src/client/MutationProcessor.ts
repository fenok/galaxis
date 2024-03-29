import { wireAbortSignals, getAbortController } from '../promise';
import { RequestQueue } from './RequestQueue';
import { RequestHelper } from './RequestHelper';
import { NonUndefined, Cache, Mutation, Resource } from '../types';

export interface MutationRequest {
    promise: Promise<unknown>;
    aborted: boolean;
    abort: () => void;
}

export interface MutationProcessorOptions<TCacheData extends NonUndefined> {
    cache: Cache<TCacheData>;
    requestQueue: RequestQueue;
    requestId(resource: unknown): string;
}

export class MutationProcessor<TCacheData extends NonUndefined> {
    private ongoingRequests: Set<MutationRequest> = new Set();
    private readonly cache: Cache<TCacheData>;
    private readonly requestQueue: RequestQueue;
    private requestId: (resource: unknown) => string;

    constructor({ cache, requestQueue, requestId }: MutationProcessorOptions<TCacheData>) {
        this.cache = cache;
        this.requestQueue = requestQueue;
        this.requestId = requestId;
    }

    public onReset() {
        this.ongoingRequests.clear();
    }

    public mutate<TData extends NonUndefined, TError extends Error, TResource extends Resource>(
        mutation: Mutation<TCacheData, TData, TError, TResource>,
    ): Promise<TData> {
        const requestId = this.requestId(mutation.resource);

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
                                data: (prevData) =>
                                    mutation.toCache!({
                                        cacheData: prevData,
                                        data,
                                        resource: mutation.resource,
                                        requestId,
                                    }),
                                clearSplitFor: mutation.optimisticData ? mutationRequest : undefined,
                            });
                        }
                    }

                    return data;
                })
                .catch((error) => {
                    if (this.ongoingRequests.has(mutationRequest)) {
                        this.ongoingRequests.delete(mutationRequest);

                        if (mutation.optimisticData && mutation.fetchPolicy !== 'no-cache') {
                            this.cache.update({
                                clearSplitFor: mutationRequest,
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

        if (mutation.optimisticData && mutation.toCache && mutation.fetchPolicy !== 'no-cache') {
            this.cache.update({
                data: (prevData) =>
                    mutation.toCache!({
                        cacheData: prevData,
                        data: mutation.optimisticData!,
                        resource: mutation.resource,
                        requestId,
                    }),
                createSplitFor: mutationRequest,
            });
        }

        wireAbortSignals(mutationRequest.abort, mutation.abortSignal);

        this.ongoingRequests.add(mutationRequest);

        return mutationRequest.promise as Promise<TData>;
    }
}
