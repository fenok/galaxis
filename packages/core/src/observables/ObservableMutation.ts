import { Mutation, NonUndefined, Resource } from '../types';
import { Client } from '../client';

export interface ObservableMutationState<TData extends NonUndefined, TError extends Error> {
    loading: boolean;
    data: TData | undefined;
    error: TError | undefined;
    called: boolean;
}

export class ObservableMutation<
    TCacheData extends NonUndefined,
    TData extends NonUndefined,
    TError extends Error,
    TResource extends Resource
> {
    private onChange: () => void;
    private client?: Client;
    private mutation?: Mutation<TCacheData, TData, TError, TResource>;
    private currentRequest?: Promise<TData>;

    private unsubscribeFromOnReset?: () => void;

    private state: ObservableMutationState<TData, TError> = {
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

    public setOptions(client: Client, mutation?: Mutation<TCacheData, TData, TError, TResource>) {
        if (this.client !== client) {
            this.unsubscribeFromOnReset?.();
            this.unsubscribeFromOnReset = client.onReset(this.reset);
        }

        this.client = client;
        this.mutation = mutation;
    }

    public execute = (mutation?: Mutation<TCacheData, TData, TError, TResource>) => {
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

    private decorateWithStateUpdates(promise: Promise<TData>) {
        this.currentRequest = promise;

        return promise
            .then((data) => {
                if (this.currentRequest === promise) {
                    this.setState({ data, error: undefined, loading: false });
                }

                return data;
            })
            .catch((error: TError) => {
                if (this.currentRequest === promise) {
                    this.setState({ data: undefined, error, loading: false });
                }

                throw error;
            });
    }

    private setState(newState: Partial<ObservableMutationState<TData, TError>>) {
        const nextState = { ...this.state, ...newState };

        if (!this.areStatesEqual(this.state, nextState)) {
            this.state = nextState;

            this.onChange();
        }
    }

    private areStatesEqual(
        first: ObservableMutationState<TData, TError>,
        second: ObservableMutationState<TData, TError>,
    ) {
        return (
            first.data === second.data &&
            first.loading === second.loading &&
            first.error === second.error &&
            first.called === second.called
        );
    }
}
