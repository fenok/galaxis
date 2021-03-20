import { NonUndefined, Query } from '../types';
import { Client } from './Client';
import { SsrPromisesManager } from './SsrPromisesManager';
import { QueryCache, QueryState } from './QueryProcessor';
import { logger } from '../logger';

export interface QueryManagerOptions {
    forceUpdate(): void;
}

export class QueryManager<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    private forceUpdate: () => void;
    private defaultQueryHash: string | number = '';
    private queryHash: string | number = '';
    private query!: Query<C, D, E, R>;
    private client!: Client;
    private ssrPromisesManager?: SsrPromisesManager;
    private loading = false;
    private queryCache?: QueryCache<D, E>;
    private abortController?: AbortController;
    private softAbortController?: AbortController;
    private requestCallId = 1;
    private unsubscribe?: () => void;
    private boundRefetch: () => Promise<D>;
    private boundAbort: () => void;

    constructor({ forceUpdate }: QueryManagerOptions) {
        this.forceUpdate = forceUpdate;
        this.boundRefetch = this.refetch.bind(this);
        this.boundAbort = this.abort.bind(this);
    }

    public process(query: Query<C, D, E, R>, client: Client, ssrPromisesManager?: SsrPromisesManager) {
        if (
            this.client !== client ||
            this.queryHash !== this.client.getHash(query) ||
            this.defaultQueryHash !== this.client.getDynamicDefaultQueryHash() ||
            this.ssrPromisesManager !== ssrPromisesManager
        ) {
            this.cleanup();

            this.client = client;
            this.ssrPromisesManager = ssrPromisesManager;
            this.query = query;
            this.queryHash = this.client.getHash(query);
            this.defaultQueryHash = this.client.getDynamicDefaultQueryHash();

            this.performRequest()?.catch((error: Error) => {
                if (error !== this.queryCache?.error) {
                    logger.warn(
                        'Query request promise returned an error that is different from the cached one:',
                        error,
                    );
                }
            });
        }

        return {
            loading: this.loading,
            data: this.queryCache?.data,
            error: this.queryCache?.error,
            refetch: this.boundRefetch,
            abort: this.boundAbort,
        };
    }

    public cleanup() {
        this.unsubscribe?.();
        this.unsubscribe = undefined;
        this.softAbort();
    }

    private performRequest(refetch?: boolean): Promise<D> | undefined {
        this.ensureAbortControllers();

        const queryResult = this.client.query(
            {
                ...this.query,
                fetchPolicy: this.query.lazy ? 'cache-only' : this.query.fetchPolicy,
                abortSignal: this.abortController?.signal,
                softAbortSignal: this.softAbortController?.signal,
                forceNewRequestOnMerge: refetch || this.query.forceNewRequestOnMerge,
            },
            { required: refetch },
        );

        this.loading = refetch || queryResult.requestFlags.required;

        if (!refetch) {
            try {
                const { queryState, unsubscribe } = this.client.subscribe(this.query, this.onExternalChange.bind(this));
                this.queryCache = queryState.cache;
                this.unsubscribe = unsubscribe;
            } catch {
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

                return data;
            })
            .catch((error: Error) => {
                if (this.requestCallId === callId) {
                    this.loading = false;
                    if (!this.unsubscribe) {
                        this.queryCache = { data: this.queryCache?.data, error };
                    }
                    this.forceUpdate();
                }

                throw error;
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

        return (
            request ||
            Promise.reject(
                new Error('Failed to make network request. If this is happening on client side, file an issue.'),
            )
        );
    }

    private onExternalChange(queryState: QueryState<D, E>) {
        this.queryCache = queryState.cache;
        if (!this.loading) {
            this.forceUpdate();
        }
    }
}
