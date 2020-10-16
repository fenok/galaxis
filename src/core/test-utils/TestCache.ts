import { NonUndefined, Cache, UpdateStateOpts } from '../types';

interface CacheState<D extends NonUndefined = null> {
    data: D;
    requestErrors: { [id: string]: Error | undefined };
}

export class TestCache<D extends NonUndefined> implements Cache<D> {
    private _state: CacheState<D>;
    private subscribers: (() => void)[] = [];
    private emptyData: D;

    constructor(opts: { initialData: D; emptyData: D }) {
        this.emptyData = opts.emptyData;

        this._state = {
            data: opts.initialData,
            requestErrors: {},
        };
    }

    private set state(newState: CacheState<D>) {
        this._state = newState;
        this.subscribers.forEach(subscriber => subscriber());
    }

    private get state() {
        return this._state;
    }

    public getCacheData() {
        return this.state.data;
    }

    public getRequestError(requestId: string): Error | undefined {
        return this.state.requestErrors[requestId];
    }

    public subscribe(callback: () => void) {
        this.subscribers.push(callback);

        return () => {
            this.subscribers = this.subscribers.filter(subscriber => subscriber !== callback);
        };
    }

    public purge() {
        this.state = {
            data: this.emptyData,
            requestErrors: {},
        };
    }

    public updateState({ updateCacheData, updateRequestError }: UpdateStateOpts<D>) {
        const newData = updateCacheData ? updateCacheData(this.state.data) : this.state.data;
        const currentRequestError = updateRequestError ? this.getRequestError(updateRequestError.requestId) : undefined;
        const newRequestError = updateRequestError ? updateRequestError.update(currentRequestError) : undefined;

        if (newData !== this.state.data || newRequestError !== currentRequestError) {
            this.state = {
                requestErrors: updateRequestError
                    ? {
                          ...this.state.requestErrors,
                          [updateRequestError.requestId]: newRequestError,
                      }
                    : this.state.requestErrors,
                data: newData,
            };
        }
    }
}
