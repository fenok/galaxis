import { Mutation, NonUndefined } from '../types';
import { Client } from './Client';

export interface MutationManagerOptions {
    forceUpdate(): void;
}

export interface MutationManagerResult<D extends NonUndefined, E extends Error> {
    loading: boolean;
    data: D | undefined;
    error: E | Error | undefined;
    mutate(): Promise<D>;
    abort(): void;
}

export class MutationManager<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    private forceUpdate: () => void;
    private mutationHash!: string;
    private mutation!: Mutation<C, D, E, R>;
    private client!: Client;
    private loading = false;
    private data?: D;
    private error?: E | Error;
    private abortController?: AbortController;
    private mutationId = 1;
    private boundAbort: () => void;
    private boundMutate: () => Promise<D>;

    constructor({ forceUpdate }: MutationManagerOptions) {
        this.forceUpdate = forceUpdate;
        this.boundAbort = this.abort.bind(this);
        this.boundMutate = this.mutate.bind(this);
    }

    // TODO: Enforce return type: MutationManagerResult<D, E>
    // Currently removed to fix @typescript-eslint/unbound-method error. Typing this as void didn't help.
    public process(mutation: Mutation<C, D, E, R>, client: Client) {
        if (this.client !== client || this.mutationHash !== this.client.getMutationHash(mutation)) {
            this.mutationId += 1;
            this.data = undefined;
            this.error = undefined;
            this.loading = false;

            this.client = client;
            this.mutation = mutation;
            this.mutationHash = this.client.getMutationHash(mutation);
        }

        return {
            loading: this.loading,
            data: this.data,
            error: this.error,
            mutate: this.boundMutate,
            abort: this.boundAbort,
        };
    }

    private mutate() {
        this.ensureAbortController();

        const mutationId = this.mutationId;
        this.loading = true;

        this.forceUpdate();

        return this.client
            .mutate({ ...this.mutation, abortSignal: this.abortController?.signal })
            .then((data) => {
                if (mutationId === this.mutationId) {
                    this.loading = false;
                    this.data = data;
                    this.error = undefined;

                    this.forceUpdate();
                }

                return data;
            })
            .catch((error: Error) => {
                if (mutationId === this.mutationId) {
                    this.loading = false;
                    this.error = error;

                    this.forceUpdate();
                }

                throw Error;
            });
    }

    private ensureAbortController() {
        if (typeof AbortController !== 'undefined') {
            if (!this.abortController || this.abortController.signal.aborted) {
                this.abortController = new AbortController();
            }
        }
    }

    private abort() {
        this.abortController?.abort();
    }
}
