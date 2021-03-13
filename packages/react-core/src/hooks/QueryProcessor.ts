import { Client, NonUndefined, BaseQuery, QueryState, SsrPromisesManager, logger, QueryCache } from '@fetcher/core';

export interface QueryProcessorOptions {
    forceUpdate(): void;
}

export class QueryProcessor<C extends NonUndefined, R extends NonUndefined, E extends Error, I> {
    private forceUpdate: () => void;
    private queryHash?: string | number;
    private query!: BaseQuery<C, R, E, I>;
    private client!: Client<C>;
    private ssrPromisesManager?: SsrPromisesManager;
    private loading = false;
    private queryCache?: QueryCache<R, E>;
    private abortController?: AbortController;
    private queryPromise: Promise<any> | undefined;
    private unsubscribe?: () => void;

    constructor({ forceUpdate }: QueryProcessorOptions) {
        this.forceUpdate = forceUpdate;
    }

    public onRender(
        query: BaseQuery<C, R, E, I>,
        queryHash: string | number,
        client: Client<C>,
        ssrPromisesManager: SsrPromisesManager | null,
    ) {
        this.ssrPromisesManager = ssrPromisesManager ?? undefined;

        if (this.queryHash !== queryHash || this.client !== client) {
            this.cleanup();

            this.queryHash = queryHash;
            this.query = query;
            this.client = client;

            void this.performRequest();
        }

        return {
            loading: this.loading,
            data: this.queryCache?.data,
            error: this.queryCache?.error,
            refetch: this.refetch.bind(this),
            abort: this.abort.bind(this),
        };
    }

    public cleanup() {
        this.unsubscribe?.();
        this.unsubscribe = undefined;
        this.abort();
    }

    private performRequest(refetch?: boolean) {
        this.ensureAbortController();

        const queryResult = this.client.query(
            { ...this.query, abortSignal: this.abortController?.signal },
            { required: refetch },
        );

        this.loading = refetch || queryResult.requestFlags.required;

        if (!refetch) {
            if (this.query.fetchPolicy !== 'no-cache') {
                const { queryState, unsubscribe } = this.client.subscribe(this.query, this.onExternalChange.bind(this));
                this.queryCache = queryState.cache;
                this.unsubscribe = unsubscribe;
            } else {
                this.queryCache = { data: undefined, error: undefined };
            }
        }

        if (this.ssrPromisesManager && queryResult.request) {
            this.ssrPromisesManager.addPromise(queryResult.request);
        }

        this.queryPromise = queryResult.request;

        return queryResult.request
            ?.then((data) => {
                if (this.queryPromise === queryResult.request) {
                    this.loading = false;
                    if (!this.unsubscribe) {
                        this.queryCache = { data, error: undefined };
                    }
                    this.forceUpdate();
                }
            })
            .catch((error) => {
                if (this.queryPromise === queryResult.request) {
                    this.loading = false;
                    if (!this.unsubscribe) {
                        this.queryCache = { data: this.queryCache?.data, error };
                    }
                    this.forceUpdate();

                    if (process.env.NODE_ENV !== 'production' && error !== this.queryCache?.error) {
                        logger.warn(
                            'Query request promise returned an error that is different from the cached one:',
                            error,
                        );
                    }
                }
            });
    }

    private ensureAbortController() {
        if (!this.abortController || this.abortController.signal.aborted) {
            if (typeof AbortController !== 'undefined') {
                this.abortController = new AbortController();
            }
        }
    }

    private abort() {
        this.abortController?.abort();
    }

    private refetch() {
        this.abort();
        const request = this.performRequest(true);
        this.forceUpdate();

        return request;
    }

    private onExternalChange(queryState: QueryState<R, E>) {
        this.queryCache = queryState.cache;
        if (!this.loading) {
            this.forceUpdate();
        }
    }
}
