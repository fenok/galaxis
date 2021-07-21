import { NonUndefined, Query, Cache } from '../types';
import { Client } from '../client';
import { logger } from '../logger';

export interface QueryObserverState<D extends NonUndefined, E extends Error> {
    loading: boolean;
    data: D | undefined;
    error: E | Error | undefined;
}

export class QueryObserver<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    private query?: Query<C, D, E, R>;
    private client: Client<C, Cache<C>, D, E, R>;
    private onChange: () => void;
    private currentRequest?: Promise<D>;
    private unsubscribe?: () => void;

    constructor(client: Client<C, Cache<C>, D, E, R>, onChange: () => void) {
        this.client = client;
        this.onChange = onChange;
    }

    private state: QueryObserverState<D, E> = {
        loading: false,
        data: undefined,
        error: undefined,
    };

    private nextState: QueryObserverState<D, E> = {
        loading: false,
        data: undefined,
        error: undefined,
    };

    public setOptions(query: Query<C, D, E, R>) {
        this.dispose();

        this.query = query;

        const queryState = this.client.readQuery(this.query);

        this.setState({
            loading: queryState.requestRequired,
            data: queryState.data,
            error: queryState.error,
        });
    }

    public activate() {
        if (this.query) {
            const [, unsubscribe] = this.client.watchQuery(this.query, this.onExternalChange.bind(this));

            this.unsubscribe = unsubscribe;

            const [queryState, promise] = this.client.query(this.query);

            this.setState({
                loading: queryState.requestRequired,
                data: queryState.data,
                error: queryState.error,
            });

            return promise ? this.updateCurrentPromise(promise) : promise;
        }

        return undefined;
    }

    public dispose() {
        this.unsubscribe?.();
        this.currentRequest = undefined;
    }

    public prefetch(): Promise<D> | undefined {
        if (this.query) {
            const [, promise] = this.client.query(this.query);

            return promise;
        }

        return undefined;
    }

    public refetch() {
        if (this.query) {
            const promise = this.client.fetchQuery(this.query);

            this.setState({
                loading: true,
            });

            return this.updateCurrentPromise(promise);
        }

        return Promise.reject(new Error('No query to refetch'));
    }

    private updateCurrentPromise(promise: Promise<D>) {
        this.currentRequest = promise;

        return promise
            .then((data) => {
                if (this.currentRequest === promise) {
                    if (!this.unsubscribe) {
                        this.onExternalChange({ data, error: undefined });
                    }
                    this.setState({ loading: false });
                }
            })
            .catch((error: Error) => {
                if (this.currentRequest === promise) {
                    if (!this.unsubscribe) {
                        this.onExternalChange({ error });
                    }

                    if (error !== this.nextState.error) {
                        logger.warn(
                            'Query request promise returned an error that is different from the cached one:',
                            error,
                        );
                    }

                    this.setState({ loading: false });
                }
            });
    }

    private onExternalChange(externalState: Partial<QueryObserverState<D, E>>) {
        this.setState(externalState);
    }

    private setState(newState: Partial<QueryObserverState<D, E>>) {
        this.nextState = { ...this.nextState, ...newState };

        if (!this.state.loading) {
            this.state = this.nextState;
            this.onChange();
        }
    }
}
