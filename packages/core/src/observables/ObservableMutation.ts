import { Mutation, NonUndefined, Resource } from '../types';
import { Client } from '../client';

export interface ObservableMutationState<D extends NonUndefined, E extends Error> {
    loading: boolean;
    data: D | undefined;
    error: E | undefined;
    called: boolean;
}

export class ObservableMutation<C extends NonUndefined, D extends NonUndefined, E extends Error, R extends Resource> {
    private onChange: () => void;
    private client?: Client;
    private mutation?: Mutation<C, D, E, R>;
    private currentRequest?: Promise<D>;

    private unsubscribeFromOnReset?: () => void;

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
        if (this.client !== client) {
            this.unsubscribeFromOnReset?.();
            this.unsubscribeFromOnReset = client.onReset(this.reset);
        }

        this.client = client;
        this.mutation = mutation;
    }

    public execute = (mutation?: Mutation<C, D, E, R>) => {
        if (this.client) {
            const mutationToExecute = mutation || this.mutation;

            if (mutationToExecute) {
                this.setState({ called: true, loading: true, data: undefined, error: undefined });

                return this.decorateWithStateUpdates(this.client.mutate(mutationToExecute));
            }

            return Promise.reject(new Error('No mutation to execute'));
        }

        return Promise.reject(new Error('No client provided'));
    };

    public reset = () => {
        this.currentRequest = undefined;
        this.setState({ loading: false, called: false, data: undefined, error: undefined });
    };

    public dispose() {
        this.unsubscribeFromOnReset?.();
        this.unsubscribeFromOnReset = undefined;
    }

    private decorateWithStateUpdates(promise: Promise<D>) {
        this.currentRequest = promise;

        return promise
            .then((data) => {
                if (this.currentRequest === promise) {
                    this.setState({ data, error: undefined, loading: false });
                }

                return data;
            })
            .catch((error: E) => {
                if (this.currentRequest === promise) {
                    this.setState({ data: undefined, error, loading: false });
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
