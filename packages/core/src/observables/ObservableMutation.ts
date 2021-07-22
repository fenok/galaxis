import { Mutation, NonUndefined } from '../types';
import { Client } from '../client';

export interface ObservableMutationState<D extends NonUndefined, E extends Error> {
    loading: boolean;
    data: D | undefined;
    error: E | Error | undefined;
    called: boolean;
}

export class ObservableMutation<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    private onChange: () => void;
    private client?: Client;
    private mutation?: Mutation<C, D, E, R>;
    private currentRequest?: Promise<D>;

    private state: ObservableMutationState<D, E> = {
        loading: false,
        data: undefined,
        error: undefined,
        called: false,
    };

    public constructor(onChange: () => void) {
        this.onChange = onChange;
    }

    public getState() {
        return this.state;
    }

    public setOptions(client: Client, mutation?: Mutation<C, D, E, R>) {
        if (this.client !== client && this.mutation !== mutation) {
            this.reset();

            this.client = client;
            this.mutation = mutation;
        }
    }

    public execute = () => {
        if (this.client && this.mutation) {
            this.setState({ loading: true, called: true });

            return this.decorateWithStateUpdates(this.client.mutate(this.mutation));
        }

        return Promise.reject(new Error('No mutation to execute'));
    };

    public reset = () => {
        this.currentRequest = undefined;
        this.setState({ loading: false, called: false, data: undefined, error: undefined });
    };

    private decorateWithStateUpdates(promise: Promise<D>) {
        this.currentRequest = promise;

        return promise
            .then((data) => {
                if (this.currentRequest === promise) {
                    this.setState({ data, error: undefined, loading: false });
                }

                return data;
            })
            .catch((error: Error) => {
                if (this.currentRequest === promise) {
                    this.setState({ error, loading: false });
                }

                throw error;
            });
    }

    private setState(newState: Partial<ObservableMutationState<D, E>>) {
        const nextState = { ...this.state, ...newState };

        if (!this.areStatesEqual(this.state, nextState)) {
            this.state = nextState;

            this.onChange();
        }
    }

    private areStatesEqual(first: ObservableMutationState<D, E>, second: ObservableMutationState<D, E>) {
        return (
            first.data === second.data &&
            first.loading === second.loading &&
            first.error === second.error &&
            first.called === second.called
        );
    }
}
