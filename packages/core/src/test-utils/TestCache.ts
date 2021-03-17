import { NonUndefined, Cache, UpdateStateOptions } from '../types';

interface CacheState<C extends NonUndefined = null> {
    data: C;
    requestErrors: { [id: string]: Error | undefined };
}

export class TestCache<C extends NonUndefined> implements Cache<C> {
    private _state: CacheState<C>;
    private subscribers: (() => void)[] = [];
    private emptyData: C;

    constructor(opts: { initialData: C; emptyData: C }) {
        this.emptyData = opts.emptyData;

        this._state = {
            data: opts.initialData,
            requestErrors: {},
        };
    }

    private set state(newState: CacheState<C>) {
        this._state = newState;
        this.subscribers.forEach((subscriber) => subscriber());
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
            this.subscribers = this.subscribers.filter((subscriber) => subscriber !== callback);
        };
    }

    public purge() {
        this.state = {
            data: this.emptyData,
            requestErrors: {},
        };
    }

    public updateState({ data, error }: UpdateStateOptions<C>) {
        this.state = {
            requestErrors: error
                ? {
                      ...this.state.requestErrors,
                      [error[0]]: error[1],
                  }
                : this.state.requestErrors,
            data: data !== undefined ? data : this.state.data,
        };
    }
}
