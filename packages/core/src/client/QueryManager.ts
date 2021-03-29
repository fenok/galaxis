import { NonUndefined, Query } from '../types';
import { SsrPromisesManager } from './SsrPromisesManager';
import { QueryProcessor, QueryResult, QueryState } from './QueryProcessor';
import { logger } from '../logger';

export interface QueryManagerOptions<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    query: Query<C, D, E, R> | undefined;
    queryProcessor: QueryProcessor<C>;
    ssrPromisesManager?: SsrPromisesManager;
    onChange(result: QueryManagerResult<D, E>): void;
}

export interface QueryManagerExternalState<D extends NonUndefined, E extends Error> {
    data: D | undefined;
    error: E | Error | undefined;
}

export interface QueryManagerState<D extends NonUndefined, E extends Error> {
    loading: boolean;
    data: D | undefined;
    error: E | Error | undefined;
    executed: boolean;
}

export type QueryManagerApi<D extends NonUndefined, E extends Error> = {
    refetch: () => Promise<D>;
    abort: () => void;
    execute: () => QueryResult<D, E>;
    reset: () => void;
};

export type QueryManagerResult<D extends NonUndefined, E extends Error> = QueryManagerState<D, E> &
    QueryManagerApi<D, E>;

export class QueryManager<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    private onChange?: (result: QueryManagerResult<D, E>) => void;
    private query?: Query<C, D, E, R>;
    private queryProcessor: QueryProcessor<C>;
    private ssrPromisesManager?: SsrPromisesManager;
    private state: QueryManagerState<D, E> = {
        loading: false,
        data: undefined,
        error: undefined,
        executed: false,
    };
    private externalState?: QueryManagerExternalState<D, E>;
    private abortController?: AbortController;
    private softAbortController?: AbortController;
    private networkRequestId = 1;
    private unsubscribe?: () => void;
    private cacheable = false;
    private instantiated = false;

    constructor({ onChange, queryProcessor, query, ssrPromisesManager }: QueryManagerOptions<C, D, E, R>) {
        this.onChange = onChange;
        this.query = query;
        this.queryProcessor = queryProcessor;
        this.ssrPromisesManager = ssrPromisesManager;

        if (!query?.lazy) {
            this.execute();
        }

        this.instantiated = true;
    }

    public getState(): QueryManagerState<D, E> {
        return this.state;
    }

    public getApi(): QueryManagerApi<D, E> {
        return {
            refetch: this.refetch,
            abort: this.abort,
            execute: this.execute,
            reset: this.reset,
        };
    }

    public getResult(): QueryManagerResult<D, E> {
        return { ...this.getState(), ...this.getApi() };
    }

    public cleanup() {
        this.networkRequestId += 1;
        this.unsubscribe?.();
        this.softAbort();
        this.onChange = undefined;
    }

    private reset = () => {
        this.networkRequestId += 1;
        this.unsubscribe?.();
        this.softAbort();
        this.externalState = undefined;
        this.cacheable = false;
        this.setState({ loading: false, error: undefined, data: undefined, executed: false });
    };

    private abort = () => {
        this.abortController?.abort();
    };

    private softAbort() {
        this.softAbortController?.abort();
    }

    private execute = () => {
        if (this.query) {
            return this.executeInner(this.query);
        }

        throw new Error('No query to execute');
    };

    private refetch = () => {
        if (this.state.executed && this.query) {
            return this.fetchInner(this.query);
        }

        return Promise.reject(new Error('No query or the query is not executed yet.'));
    };

    private executeInner(nonPatchedQuery: Query<C, D, E, R>): QueryResult<D, E> {
        const networkRequestId = ++this.networkRequestId;

        this.unsubscribe?.();
        this.softAbort();

        const query = this.getPatchedQuery(nonPatchedQuery);

        const queryResult = this.queryProcessor.query(query, this.onExternalChange.bind(this));

        this.cacheable = queryResult.cacheable;

        this.externalState = { data: queryResult.data, error: queryResult.error };

        this.setState({
            executed: true,
            loading: queryResult.requestRequired,
            data: queryResult.data,
            error: queryResult.error,
        });

        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.unsubscribe = queryResult.unsubscribe;

        if (this.ssrPromisesManager && queryResult.request && !this.instantiated) {
            this.ssrPromisesManager.addPromise(queryResult.request);
        }

        const result = {
            ...queryResult,
            request: queryResult.request && this.updateStateWithResult(queryResult.request, networkRequestId),
        };

        result.request && this.catchExecutionError(result.request, networkRequestId);

        return { ...result, unsubscribe: undefined };
    }

    private fetchInner(nonPatchedQuery: Query<C, D, E, R>): Promise<D> {
        const callId = ++this.networkRequestId;

        this.softAbort();

        const query = this.getPatchedQuery(nonPatchedQuery, true);

        const request = this.queryProcessor.fetchQuery(query);
        this.setState({ loading: true });

        return this.updateStateWithResult(request, callId);
    }

    private getPatchedQuery(query: Query<C, D, E, R>, refetch?: boolean): Query<C, D, E, R> {
        this.ensureAbortControllers();

        return {
            ...query,
            abortSignal: this.abortController?.signal,
            softAbortSignal: this.softAbortController?.signal,
            forceRequestOnMerge: refetch || query.forceRequestOnMerge,
        };
    }

    private updateStateWithResult(promise: Promise<D>, networkRequestId: number): Promise<D> {
        return promise
            .then((data) => {
                if (this.networkRequestId === networkRequestId) {
                    this.setState({
                        data: this.cacheable ? this.externalState?.data : data,
                        error: undefined,
                        loading: false,
                    });
                }

                return data;
            })
            .catch((error: Error) => {
                if (this.networkRequestId === networkRequestId) {
                    this.setState({ error: this.cacheable ? this.externalState?.error : error, loading: false });
                }

                throw error;
            });
    }

    private catchExecutionError(promise: Promise<D>, callId: number): Promise<D | void> {
        return promise.catch((error: Error) => {
            if (this.networkRequestId === callId) {
                if (error !== this.state.error) {
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

    private onExternalChange(queryState: QueryState<D, E>) {
        const externalState = { data: queryState.data, error: queryState.error };
        this.externalState = externalState;

        if (!this.state.loading) {
            this.setState(externalState);
        }
    }

    private setState(state: Partial<QueryManagerState<D, E>>) {
        const nextState = { ...this.state, ...state };
        const shouldUpdate = !this.areStatesEqual(this.state, nextState);

        this.state = nextState;

        if (shouldUpdate && this.instantiated) {
            this.onChange?.(this.getResult());
        }
    }

    private areStatesEqual(a: QueryManagerState<D, E>, b: QueryManagerState<D, E>) {
        return a.loading === b.loading && a.data === b.data && a.error === b.error && a.executed === b.executed;
    }
}
