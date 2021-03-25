import { Mutation, NonUndefined } from '../types';
import { MutationProcessor } from './MutationProcessor';

export interface MutationManagerOptions<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    mutation: Mutation<C, D, E, R> | undefined;
    mutationProcessor: MutationProcessor<C>;
    onChange(result: MutationManagerResult<D, E>): void;
}

export interface MutationManagerState<D extends NonUndefined, E extends Error> {
    loading: boolean;
    data: D | undefined;
    error: E | Error | undefined;
    executed: boolean;
}

export interface MutationManagerApi<D extends NonUndefined> {
    execute(): Promise<D>;
    abort(): void;
    reset(): void;
}

export type MutationManagerResult<D extends NonUndefined, E extends Error> = MutationManagerState<D, E> &
    MutationManagerApi<D>;

export class MutationManager<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    private onChange?: (result: MutationManagerResult<D, E>) => void;
    private mutation?: Mutation<C, D, E, R>;
    private mutationProcessor: MutationProcessor<C>;
    private state: MutationManagerState<D, E> = {
        loading: false,
        data: undefined,
        error: undefined,
        executed: false,
    };
    private abortController?: AbortController;
    private networkRequestId = 1;
    private boundAbort: () => void;
    private boundExecute: () => Promise<D>;
    private boundReset: () => void;

    constructor({ onChange, mutation, mutationProcessor }: MutationManagerOptions<C, D, E, R>) {
        this.mutation = mutation;
        this.onChange = onChange;
        this.mutationProcessor = mutationProcessor;
        this.boundAbort = this.abort.bind(this);
        this.boundExecute = this.execute.bind(this);
        this.boundReset = this.reset.bind(this);
    }

    public getState() {
        return this.state;
    }

    public getApi() {
        return {
            execute: this.boundExecute,
            abort: this.boundAbort,
            reset: this.boundReset,
        };
    }

    public getResult() {
        return { ...this.getState(), ...this.getApi() };
    }

    public cleanup() {
        this.networkRequestId += 1;
        this.onChange = undefined;
    }

    private abort() {
        this.abortController?.abort();
    }

    private reset() {
        this.networkRequestId += 1;
        this.abortController = undefined;

        this.setState({ executed: false, data: undefined, error: undefined, loading: false });
    }

    private execute() {
        if (!this.mutation) {
            return Promise.reject(new Error('No mutation to execute.'));
        }

        this.ensureAbortController();

        const networkRequestId = ++this.networkRequestId;
        this.setState({ loading: true, executed: true });

        return this.mutationProcessor
            .mutate({ ...this.mutation, abortSignal: this.abortController?.signal })
            .then((data) => {
                if (networkRequestId === this.networkRequestId) {
                    this.setState({ loading: false, data, error: undefined });
                }

                return data;
            })
            .catch((error: Error) => {
                if (networkRequestId === this.networkRequestId) {
                    this.setState({ loading: false, error });
                }

                throw Error;
            });
    }

    private ensureAbortController() {
        if (typeof AbortController !== 'undefined') {
            this.abortController = new AbortController();
        }
    }

    private setState(state: Partial<MutationManagerState<D, E>>) {
        const nextState = { ...this.state, ...state };
        const shouldUpdate = !this.areStatesEqual(this.state, nextState);

        this.state = nextState;

        if (shouldUpdate) {
            this.onChange?.(this.getResult());
        }
    }

    private areStatesEqual(a: MutationManagerState<D, E>, b: MutationManagerState<D, E>) {
        return a.data === b.data && a.error === b.error && a.loading === b.loading && a.executed === b.executed;
    }
}
