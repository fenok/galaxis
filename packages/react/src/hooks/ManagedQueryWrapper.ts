import { NonUndefined, Query, Client, SsrPromisesManager, QueryManagerResult } from '@fetcher/core';

export class ManagedQueryWrapper<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    private queryHash?: string;
    private client!: Client;
    private ssrPromisesManager?: SsrPromisesManager;
    private result!: QueryManagerResult<D, E>;
    private dispose?: () => void;
    private onChange: () => void;

    constructor(onChange: () => void) {
        this.onChange = onChange;
    }

    public process(query: Query<C, D, E, R> | undefined, client: Client, ssrPromisesManager?: SsrPromisesManager) {
        const queryHash = query ? client.hash(query) : undefined;
        if (this.client !== client || this.queryHash !== queryHash || this.ssrPromisesManager !== ssrPromisesManager) {
            this.client = client;
            this.queryHash = queryHash;
            this.ssrPromisesManager = ssrPromisesManager;

            this.dispose?.();

            [this.result, this.dispose] = this.client.manageQuery(
                query,
                this.onChangeInner.bind(this),
                ssrPromisesManager,
            );
        }

        return this.result;
    }

    public cleanup() {
        this.dispose?.();
    }

    private onChangeInner(result: QueryManagerResult<D, E>) {
        this.result = result;
        this.onChange();
    }
}
