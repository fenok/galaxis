import { Client, NonUndefined, BaseQuery, QueryState, SsrPromisesManager, logger, QueryCache } from '@fetcher/core';

export interface QueryProcessorOptions {
    forceUpdate(): void;
}

export class QueryProcessor<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    private forceUpdate: () => void;
    private queryHash?: string | number;
    private query!: BaseQuery<C, D, E, R>;
    private client!: Client<C>;
    private ssrPromisesManager?: SsrPromisesManager;
    private loading = false;
    private queryCache?: QueryCache<D, E>;
    private abortController?: AbortController;
    private softAbortController?: AbortController;
    private requestCallId = 1;
    private unsubscribe?: () => void;

    constructor({ forceUpdate }: QueryProcessorOptions) {
        this.forceUpdate = forceUpdate;
    }

    public onRender(
        query: BaseQuery<C, D, E, R>,
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
        this.softAbort();
    }

    private performRequest(refetch?: boolean) {
        this.ensureAbortControllers();

        const queryResult = this.client.query(
            {
                ...this.query,
                abortSignal: this.abortController?.signal,
                softAbortSignal: this.softAbortController?.signal,
                forceNewRequestOnRequestMerge: refetch || this.query.forceNewRequestOnRequestMerge,
            },
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

        const callId = ++this.requestCallId;

        return queryResult.request
            ?.then((data) => {
                if (this.requestCallId === callId) {
                    this.loading = false;
                    if (!this.unsubscribe) {
                        this.queryCache = { data, error: undefined };
                    }
                    this.forceUpdate();
                }
            })
            .catch((error: Error) => {
                if (this.requestCallId === callId) {
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

    private ensureAbortControllers() {
        if (typeof AbortController !== 'undefined') {
            if (!this.abortController || this.abortController.signal.aborted) {
                this.abortController = new AbortController();
            }

            if (!this.softAbortController || this.softAbortController.signal.aborted) {
                this.softAbortController = new AbortController();
            }
        }
    }

    private abort() {
        this.abortController?.abort();
    }

    private softAbort() {
        this.softAbortController?.abort();
    }

    private refetch() {
        this.softAbort();
        const request = this.performRequest(true);
        this.forceUpdate();

        return request;
    }

    private onExternalChange(queryState: QueryState<D, E>) {
        this.queryCache = queryState.cache;
        if (!this.loading) {
            this.forceUpdate();
        }
    }
}