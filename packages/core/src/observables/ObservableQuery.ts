import { NonUndefined, Query, Cache } from '../types';
import { Client } from '../client';
import { logger } from '../logger';

export interface ObservableQueryState<D extends NonUndefined, E extends Error> {
    loading: boolean;
    data: D | undefined;
    error: E | Error | undefined;
}

export class ObservableQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    private query?: Query<C, D, E, R>;

    private client: Client<C, Cache<C>, D, E, R>;
    private onChange: () => void;

    private currentRequest?: Promise<D>;
    private unsubscribe?: () => void;

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

    public constructor(client: Client<C, Cache<C>, D, E, R>, onChange: () => void) {
        this.client = client;
        this.onChange = onChange;
    }

    public getState() {
        return this.state;
    }

    public setOptions(query?: Query<C, D, E, R>) {
        this.stop();

        this.query = query;

        if (this.query) {
            const queryState = this.client.readQuery(this.query);

            this.setState({
                loading: queryState.requestRequired,
                data: queryState.data,
                error: queryState.error,
            });
        }
    }

    public start() {
        if (!this.executed && this.query) {
            this.executed = true;

            const [, unsubscribe] = this.client.watchQuery(this.query, this.setState.bind(this));

            this.unsubscribe = unsubscribe;

            const [queryState, promise] = this.client.query(this.query);

            this.setState({
                loading: queryState.requestRequired,
                data: queryState.data,
                error: queryState.error,
            });

            return promise ? this.decorateWithStateUpdates(promise) : promise;
        }

        return undefined;
    }

    public stop() {
        this.unsubscribe?.();
        this.unsubscribe = undefined;
        this.currentRequest = undefined;
        this.executed = false;
    }

    public prefetch(): Promise<D> | undefined {
        if (this.query) {
            const [, promise] = this.client.query(this.query);

            return promise;
        }

        return undefined;
    }

    public refetch = () => {
        if (!this.executed || !this.query) {
            return Promise.reject(new Error("Can't refetch the query that wasn't executed yet."));
        }

        return this.decorateWithStateUpdates(this.client.fetchQuery(this.query));
    };

    private decorateWithStateUpdates(promise: Promise<D>) {
        this.currentRequest = promise;

        this.setState({
            loading: true,
        });

        return promise
            .then((data) => {
                if (this.currentRequest === promise) {
                    if (!this.unsubscribe) {
                        this.setState({ data, error: undefined });
                    }
                    this.setState({ loading: false });
                }
            })
            .catch((error: Error) => {
                if (this.currentRequest === promise) {
                    if (!this.unsubscribe) {
                        this.setState({ error });
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

    private setState(newState: Partial<ObservableQueryState<D, E>>) {
        this.nextState = { ...this.nextState, ...newState };

        if (!this.state.loading || !this.nextState.loading) {
            this.state = this.nextState;
            this.onChange();
        }
    }
}