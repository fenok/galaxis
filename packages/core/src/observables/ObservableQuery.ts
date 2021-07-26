import { NonUndefined, Query, Resource } from '../types';
import { Client } from '../client';
import { logger } from '../logger';

export interface ObservableQueryState<D extends NonUndefined, E extends Error> {
    loading: boolean;
    data: D | undefined;
    error: E | undefined;
}

export class ObservableQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R extends Resource> {
    private query?: Query<C, D, E, R>;

    private client?: Client;
    private onChange: () => void;

    private currentRequest?: Promise<D>;
    private unsubscribeFromQueryState?: () => void;
    private unsubscribeFromOnReset?: () => void;

    private executed = false;

    private state: ObservableQueryState<D, E> = {
        loading: false,
        data: undefined,
        error: undefined,
    };

    private nextState: ObservableQueryState<D, E> = {
        loading: false,
        data: undefined,
        error: undefined,
    };

    private fallbackData?: D;
    private fallbackError?: E;

    public constructor(onChange: () => void) {
        this.onChange = onChange;
    }

    public getState() {
        return this.state;
    }

    public setOptions(client: Client, query?: Query<C, D, E, R>) {
        if (this.client !== client || this.query !== query) {
            this.stop();

            if (this.client !== client) {
                this.unsubscribeFromOnReset?.();
                this.unsubscribeFromOnReset = client.onReset(this.onReset.bind(this));
            }

            this.client = client;
            this.query = query;

            if (this.query) {
                const queryState = this.client.readQuery(this.query);

                this.setState({
                    loading: queryState.requestRequired,
                    data: queryState.data,
                    error: queryState.error,
                });
            } else {
                this.setState({ loading: false });
            }
        }
    }

    public start() {
        if (!this.executed && this.query && this.client) {
            this.executed = true;

            const [queryState, promise, unsubscribe] = this.client.query(this.query, this.setState.bind(this));
            this.unsubscribeFromQueryState = unsubscribe;

            this.setState({
                loading: queryState.requestRequired,
                data: queryState.data,
                error: queryState.error,
            });

            return promise ? this.decorateWithStateUpdates(promise) : promise;
        }

        return undefined;
    }

    public refetch = () => {
        if (!this.executed || !this.query || !this.client) {
            return Promise.reject(new Error("Can't refetch the query that wasn't executed yet."));
        }

        this.setState({
            loading: true,
        });

        return this.decorateWithStateUpdates(this.client.fetchQuery(this.query));
    };

    public dispose() {
        this.stop();

        this.unsubscribeFromOnReset?.();
        this.unsubscribeFromOnReset = undefined;
    }

    private stop() {
        this.unsubscribeFromQueryState?.();
        this.unsubscribeFromQueryState = undefined;
        this.currentRequest = undefined;
        this.executed = false;
    }

    private onReset() {
        if (this.executed) {
            this.stop();
            void this.start();
        }

        this.fallbackData = undefined;
        this.fallbackError = undefined;
    }

    private decorateWithStateUpdates(promise: Promise<D>) {
        this.currentRequest = promise;

        return promise
            .then((data) => {
                if (this.currentRequest === promise) {
                    if (!this.unsubscribeFromQueryState) {
                        this.setState({ data, error: undefined });
                    }
                    this.setState({ loading: false });
                }

                return data;
            })
            .catch((error: Error) => {
                if (this.currentRequest === promise) {
                    if (!this.unsubscribeFromQueryState) {
                        this.setState({ error: error as E, data: undefined });
                    }

                    if (error !== this.nextState.error) {
                        logger.warn(
                            'Query request promise returned an error that is different from the cached one:',
                            error,
                        );
                    }

                    this.setState({ loading: false });
                }

                throw error;
            });
    }

    private setState(newState: Partial<ObservableQueryState<D, E>>) {
        this.nextState = { ...this.nextState, ...newState };

        if (this.nextState.loading || this.isInvalidationState(newState)) {
            if (this.nextState.data === undefined) {
                this.nextState.data = this.fallbackData;

                if (this.nextState.error === undefined) {
                    this.nextState.error = this.fallbackError;
                }
            }
        }

        this.fallbackData = this.nextState.data;
        this.fallbackError = this.nextState.error;

        if (this.isInitialState(newState) || !this.state.loading || !this.nextState.loading) {
            if (!this.areStatesEqual(this.state, this.nextState)) {
                this.state = this.nextState;

                if (this.executed) {
                    this.onChange();
                }
            }
        }
    }

    private areStatesEqual(first: ObservableQueryState<D, E>, second: ObservableQueryState<D, E>): boolean {
        return first.data === second.data && first.error === second.error && first.loading === second.loading;
    }

    private isInvalidationState(state: Partial<ObservableQueryState<D, E>>) {
        return (
            !('loading' in state) &&
            'data' in state &&
            'error' in state &&
            state.data === undefined &&
            state.error === undefined
        );
    }

    private isInitialState(state: Partial<ObservableQueryState<D, E>>) {
        return 'loading' in state && 'data' in state && 'error' in state;
    }
}
