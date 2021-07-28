import { getAbortController, wireAbortSignals } from '../promise';
import { RequestQueue } from './RequestQueue';
import { RequestHelper } from './RequestHelper';
import { Query, Cache, NonUndefined, FetchPolicy, Resource } from '../types';

export interface QueryCache<TData extends NonUndefined, TError extends Error> {
    error?: TError;
    data?: TData;
}

export interface QueryState<TData extends NonUndefined, TError extends Error> extends QueryCache<TData, TError> {
    requestRequired: boolean;
}

export interface QueryRequest {
    cacheableQueries: Query<NonUndefined, NonUndefined, Error, Resource>[];
    promise: Promise<unknown>;
    loading: number;
    abortController?: AbortController;
    shouldRerun?: boolean;
}

export interface QueryProcessorOptions<TCacheData extends NonUndefined> {
    cache: Cache<TCacheData>;
    requestQueue: RequestQueue;
    requestId(resource: unknown): string;
}

export class QueryProcessor<TCacheData extends NonUndefined> {
    private ongoingRequests: { [requestId: string]: QueryRequest | undefined } = {};
    private isHydrate = true;
    private readonly cache: Cache<TCacheData>;
    private readonly requestQueue: RequestQueue;
    private requestId: (resource: unknown) => string;

    constructor({ cache, requestQueue, requestId }: QueryProcessorOptions<TCacheData>) {
        this.cache = cache;
        this.requestQueue = requestQueue;
        this.requestId = requestId;
    }

    public onHydrateComplete() {
        this.isHydrate = false;
    }

    public onReset() {
        Object.values(this.ongoingRequests).forEach((request) => {
            if (request) {
                request.shouldRerun = true;
                request.abortController?.abort();
            }
        });
    }

    public query<TData extends NonUndefined, TError extends Error, TResource extends Resource>(
        query: Query<TCacheData, TData, TError, TResource>,
        onChange?: (state: QueryState<TData, TError>) => void,
    ): [QueryState<TData, TError>, Promise<TData> | undefined, (() => void) | undefined] {
        const requestId = this.requestId(query.resource);

        let queryState: QueryState<TData, TError>;
        let unsubscribe: (() => void) | undefined;

        if (onChange) {
            [queryState, unsubscribe] = this.watchQuery(query, onChange);
        } else {
            queryState = this.readQuery(query);
        }

        return [
            queryState,
            queryState.requestRequired && this.isRequestAllowed(query, queryState)
                ? this.getRequestPromise(query, requestId)
                : undefined,
            unsubscribe,
        ];
    }

    public fetchQuery<TData extends NonUndefined, TError extends Error, TResource extends Resource>(
        query: Query<TCacheData, TData, TError, TResource>,
    ): Promise<TData> {
        const requestId = this.requestId(query.resource);

        return this.getRequestPromise(query, requestId);
    }

    public readQuery<TData extends NonUndefined, TError extends Error, TResource extends Resource>(
        query: Query<TCacheData, TData, TError, TResource>,
    ): QueryState<TData, TError> {
        const requestId = this.requestId(query.resource);

        const cache = !this.isFetchPolicy(query.fetchPolicy, 'no-cache')
            ? {
                  error: this.cache.getError(requestId) as TError,
                  data: query.fromCache?.({
                      cacheData: this.cache.getData(),
                      resource: query.resource,
                      requestId,
                  }),
              }
            : undefined;

        return {
            ...cache,
            requestRequired: this.isRequestRequired(query, cache),
        };
    }

    public watchQuery<TData extends NonUndefined, TError extends Error, TResource extends Resource>(
        query: Query<TCacheData, TData, TError, TResource>,
        onChange: (state: QueryState<TData, TError>) => void,
    ): [QueryState<TData, TError>, (() => void) | undefined] {
        let queryState = this.readQuery(query);

        return [
            queryState,
            !this.isFetchPolicy(query.fetchPolicy, 'no-cache')
                ? this.cache.subscribe(() => {
                      const newState = this.readQuery(query);

                      if (!this.areQueryStatesEqual(queryState, newState)) {
                          queryState = newState;
                          onChange(queryState);
                      }
                  })
                : undefined,
        ];
    }

    private getRequestPromise<TData extends NonUndefined, TError extends Error, TResource extends Resource>(
        query: Query<TCacheData, TData, TError, TResource>,
        requestId: string,
    ): Promise<TData> {
        const queryRequest = this.ensureQueryRequest(query, requestId);

        const onAbort = () => {
            queryRequest.shouldRerun = false;
            queryRequest.abortController?.abort();
        };

        const onSoftAbort = () => {
            queryRequest.loading--;

            if (queryRequest.loading <= 0) {
                onAbort();
            }
        };

        wireAbortSignals(onSoftAbort, query.softAbortSignal);
        wireAbortSignals(onAbort, query.abortSignal);

        return queryRequest.promise as Promise<TData>;
    }

    private ensureQueryRequest<TData extends NonUndefined, TError extends Error, TResource extends Resource>(
        query: Query<TCacheData, TData, TError, TResource>,
        requestId: string,
    ): QueryRequest {
        const isQueryCacheable = !this.isFetchPolicy(query.fetchPolicy, 'no-cache');

        const currentQueryRequest = this.ongoingRequests[requestId];

        if (
            !currentQueryRequest ||
            (currentQueryRequest.abortController?.signal.aborted && !currentQueryRequest.shouldRerun)
        ) {
            const abortController = getAbortController();

            const queryRequest: QueryRequest = {
                abortController,
                loading: 1,
                cacheableQueries: isQueryCacheable ? [query] : [],
                promise: Promise.resolve(),
            };

            queryRequest.promise = this.getQueryPromise(query, requestId, queryRequest);

            this.ongoingRequests[requestId] = queryRequest;
        } else {
            currentQueryRequest.loading++;
            if (isQueryCacheable) {
                // TODO: Add query only if it updates the cache differently
                // Update functions should be pure, so it should be possible to just compare the functions code
                currentQueryRequest.cacheableQueries.push(query);
            }

            if (query.forceRequestOnMerge) {
                currentQueryRequest.shouldRerun = true;
                currentQueryRequest.abortController?.abort();
            }
        }

        return this.ongoingRequests[requestId]!;
    }

    private getQueryPromise<TData extends NonUndefined, TError extends Error, TResource extends Resource>(
        query: Query<TCacheData, TData, TError, TResource>,
        requestId: string,
        queryRequest: QueryRequest,
    ): Promise<TData> {
        return this.requestQueue
            .addPromise(
                RequestHelper.getPromiseFactory(query, {
                    abortSignal: queryRequest.abortController?.signal,
                }),
                'query',
            )
            .then((data) => {
                if (this.ongoingRequests[requestId] === queryRequest) {
                    if (queryRequest.shouldRerun) {
                        queryRequest.shouldRerun = false;
                        queryRequest.abortController = getAbortController();

                        return this.getQueryPromise(query, requestId, queryRequest);
                    } else {
                        this.ongoingRequests[requestId] = undefined;

                        if (queryRequest.cacheableQueries.length) {
                            this.updateCache(
                                queryRequest.cacheableQueries as Query<TCacheData, TData, TError, TResource>[],
                                requestId,
                                {
                                    type: 'success',
                                    data,
                                },
                            );
                        }
                    }
                }
                return data;
            })
            .catch((error: Error) => {
                if (this.ongoingRequests[requestId] === queryRequest) {
                    if (queryRequest.shouldRerun) {
                        queryRequest.shouldRerun = false;
                        queryRequest.abortController = getAbortController();

                        return this.getQueryPromise(query, requestId, queryRequest);
                    } else {
                        this.ongoingRequests[requestId] = undefined;

                        if (queryRequest.cacheableQueries.length) {
                            this.updateCache(
                                queryRequest.cacheableQueries as Query<TCacheData, TData, TError, TResource>[],
                                requestId,
                                {
                                    type: 'fail',
                                    error,
                                },
                            );
                        }
                    }
                }
                throw error;
            });
    }

    private updateCache<TData extends NonUndefined, TError extends Error, TResource extends Resource>(
        queries: Query<TCacheData, TData, TError, TResource>[],
        requestId: string,
        action: { type: 'fail'; error: TError } | { type: 'success'; data: TData },
    ) {
        if (action.type === 'success') {
            this.cache.update({
                data: (prevData) =>
                    queries.reduce(
                        (data, query) =>
                            query.toCache
                                ? query.toCache({
                                      cacheData: data,
                                      data: action.data,
                                      resource: query.resource,
                                      requestId,
                                  })
                                : data,
                        prevData,
                    ),
                errors: { [requestId]: () => undefined },
            });
        } else {
            this.cache.update({
                errors: { [requestId]: () => action.error },
            });
        }
    }

    private isRequestRequired<TData extends NonUndefined, TError extends Error, TResource extends Resource>(
        query: Query<TCacheData, TData, TError, TResource>,
        queryCache?: QueryCache<TData, TError>,
    ): boolean {
        return !(
            this.isFetchPolicy(query.fetchPolicy, 'cache-only') ||
            (this.isFetchPolicy(query.fetchPolicy, 'cache-first') && queryCache?.data !== undefined) ||
            (query.optimizeOnHydrate &&
                this.isHydrate &&
                (queryCache?.data !== undefined || queryCache?.error !== undefined))
        );
    }

    private isRequestAllowed<TData extends NonUndefined, TError extends Error, TResource extends Resource>(
        query: Query<TCacheData, TData, TError, TResource>,
        queryCache?: QueryCache<TData, TError>,
    ): boolean {
        return (
            typeof window !== 'undefined' ||
            (!query.disableSsr &&
                !this.isFetchPolicy(query.fetchPolicy, 'no-cache') &&
                queryCache?.data === undefined &&
                queryCache?.error === undefined)
        );
    }

    private isFetchPolicy(fetchPolicy: FetchPolicy | undefined, value: FetchPolicy): boolean {
        return (fetchPolicy || 'cache-and-network') === value;
    }

    private areQueryStatesEqual<TData extends NonUndefined, TError extends Error>(
        a: QueryState<TData, TError>,
        b: QueryState<TData, TError>,
    ): boolean {
        // Since we compare states of the same query, that's all we need, as flags are the same if data and error are.
        return a.error === b.error && a.data === b.data;
    }
}
