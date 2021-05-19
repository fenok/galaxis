import { Client, NonUndefined, Query, QueryManager, SsrPromisesManager } from '@galaxis/core';

export class ManagedQueryWrapper<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
    private queryHash?: string;
    private client!: Client;
    private ssrPromisesManager?: SsrPromisesManager;
    private queryManager?: QueryManager<C, D, E, R>;
    private dispose?: () => void;
    private onChange: () => void;
    private areUpdatesPaused = false;

    constructor(onChange: () => void) {
        this.onChange = onChange;
    }

    public process(query: Query<C, D, E, R> | undefined, client: Client, ssrPromisesManager?: SsrPromisesManager) {
        this.areUpdatesPaused = true;

        const queryHash = query ? client.hash(query) : undefined;
        if (this.client !== client || this.queryHash !== queryHash || this.ssrPromisesManager !== ssrPromisesManager) {
            this.client = client;
            this.queryHash = queryHash;
            this.ssrPromisesManager = ssrPromisesManager;
            this.queryManager = this.queryManager || this.client.getQueryManager(this.onChangeInner.bind(this));

            const setQueryResult = this.queryManager.setQuery(query);

            if (this.ssrPromisesManager && setQueryResult && setQueryResult.request) {
                this.ssrPromisesManager.addPromise(setQueryResult.request);
            }
        }

        this.areUpdatesPaused = false;

        return { ...this.queryManager!.getState(), ...this.queryManager!.getApi() };
    }

    public cleanup() {
        this.dispose?.();
    }

    private onChangeInner() {
        if (!this.areUpdatesPaused) {
            this.onChange();
        }
    }
}
