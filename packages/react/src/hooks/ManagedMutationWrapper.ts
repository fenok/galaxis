import { Client, Mutation, MutationManagerResult, NonUndefined } from '@galaxis/core';

export class ManagedMutationWrapper<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    private queryHash?: string;
    private client!: Client;
    private result!: MutationManagerResult<D, E>;
    private dispose?: () => void;
    private onChange: () => void;

    constructor(onChange: () => void) {
        this.onChange = onChange;
    }

    public process(query: Mutation<C, D, E, R> | undefined, client: Client) {
        const queryHash = query ? client.hash(query) : undefined;
        if (this.client !== client || this.queryHash !== queryHash) {
            this.client = client;
            this.queryHash = queryHash;

            this.dispose?.();

            [this.result, this.dispose] = this.client.getMutationManager(query, this.onChangeInner.bind(this));
        }

        return this.result;
    }

    public cleanup() {
        this.dispose?.();
    }

    private onChangeInner(result: MutationManagerResult<D, E>) {
        this.result = result;
        this.onChange();
    }
}
