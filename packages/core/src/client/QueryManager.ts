import { NonUndefined, Query } from '../types';
import { Client } from './Client';
import { SsrPromisesManager } from './SsrPromisesManager';
import { QueryCache, QueryState } from './QueryProcessor';
import { logger } from '../logger';

export interface QueryManagerOptions {
    forceUpdate(): void;
}

export interface QueryManagerResult<D extends NonUndefined, E extends Error> {
    loading: boolean;
    data: D | undefined;
    error: E | Error | undefined;
    refetch(): Promise<D>;
    abort(): void;
}

export class QueryManager<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    private forceUpdate: () => void;
    private queryHash?: string;
    private query?: Query<C, D, E, R>;
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

    // TODO: Enforce return type: QueryManagerResult<D, E>
    // Currently removed to fix @typescript-eslint/unbound-method error. Typing this as void didn't help.
    public process(query: Query<C, D, E, R> | undefined, client: Client, ssrPromisesManager?: SsrPromisesManager) {
        if (
            this.client !== client ||
            this.queryHash !== (query ? this.client.getQueryHash(query) : undefined) ||
            this.ssrPromisesManager !== ssrPromisesManager
        ) {
            this.cleanup();

            this.client = client;
            this.ssrPromisesManager = ssrPromisesManager;
            this.query = query;
            this.queryHash = query ? this.client.getQueryHash(query) : undefined;

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
        const callId = ++this.requestCallId;

        if (!this.query) {
            this.loading = false;
            this.queryCache = {
                data: undefined,
                error: undefined,
            };

            return;
        }

        this.ensureAbortControllers();

        const query = {
            ...this.query,
            abortSignal: this.abortController?.signal,
            softAbortSignal: this.softAbortController?.signal,
            forceRequestOnMerge: refetch || this.query.forceRequestOnMerge,
        };

        let request: Promise<D> | undefined;

        if (!refetch) {
            const queryResult = this.client.query(query, this.onExternalChange.bind(this));
            this.loading = queryResult.requestRequired;
            request = queryResult.request;

            if (queryResult.cache && queryResult.unsubscribe) {
                this.queryCache = queryResult.cache;
                // eslint-disable-next-line @typescript-eslint/unbound-method
                this.unsubscribe = queryResult.unsubscribe;
            } else {
                this.queryCache = { data: undefined, error: undefined };
            }
        } else {
            request = this.client.fetchQuery(query);
            this.loading = true;
        }

        if (this.ssrPromisesManager && request && !refetch) {
            this.ssrPromisesManager.addPromise(request);
        }

        return request
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
        if (!this.query) {
            return Promise.reject(new Error('No query to refetch.'));
        }

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
