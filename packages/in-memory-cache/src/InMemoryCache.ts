import { devTools, ReduxDevTools } from './devTools';
import { Cache, NonUndefined, UpdateStateOpts } from '@fetcher/core';
import { serializeError, deserializeError } from 'serialize-error';

interface CacheState<D extends NonUndefined, E = Error> {
    data: D;
    error: { [id: string]: E | undefined };
}

interface CacheOptions<D extends NonUndefined> {
    emptyData: D;
    initialState?: unknown;
    enableDevTools?: boolean;
}

class InMemoryCache<D extends NonUndefined> implements Cache<D> {
    private readonly devtools: ReduxDevTools | null;

    private _state: CacheState<D>;
    private emptyData: D;

    private subscribers: ((state: CacheState<D>) => void)[] = [];

    constructor({ emptyData, initialState, enableDevTools }: CacheOptions<D>) {
        this.emptyData = emptyData;

        this._state = {
            error: {},
            data: this.emptyData,
        };

        this.devtools =
            enableDevTools && devTools
                ? devTools.connect({
                      serialize: { replacer: (_, value) => (value instanceof Error ? serializeError(value) : value) },
                  })
                : null;
        this.subscribeToDevtools();
        this.devtools?.send({ type: 'INIT', state: this.state }, this.state);

        if (initialState) {
            this.state = this.deserializeState(initialState);
            this.devtools?.send({ type: 'HYDRATE', state: initialState }, this.state);
        }
    }

    private set state(newState: CacheState<D>) {
        this._state = newState;
        this.subscribers.forEach((subscriber) => subscriber(newState));
    }

    private get state() {
        return this._state;
    }

    public getCacheData() {
        return this.state.data;
    }

    public getRequestError(requestId: string): Error | undefined {
        return this.state.error[requestId];
    }

    public extract(): unknown {
        const serializableErrors = Object.fromEntries(
            Object.entries(this.state.error).map(([id, error]) => [id, error ? serializeError(error) : undefined]),
        );

        return {
            ...this.state,
            error: serializableErrors,
        };
    }

    private deserializeState(serializableState: any): CacheState<D> {
        const deserializedErrors = Object.fromEntries(
            Object.entries(serializableState.error).map(([id, error]) => [
                id,
                error ? deserializeError(error) : undefined,
            ]),
        );

        return {
            ...serializableState,
            error: deserializedErrors,
        };
    }

    public subscribe(callback: (state: CacheState<D>) => void) {
        this.subscribers.push(callback);

        return () => {
            this.subscribers = this.subscribers.filter((subscriber) => subscriber !== callback);
        };
    }

    public purge() {
        this.state = {
            error: {},
            data: this.emptyData,
        };
    }

    public updateState(opts: UpdateStateOpts<D>) {
        this.updateStateInner(opts);
        this.devtools?.send({ type: 'UPDATE', ...opts }, this.state);
    }

    private updateStateInner({ updateCacheData, updateRequestError }: UpdateStateOpts<D>) {
        const newRequestError = updateRequestError?.update(this.getRequestError(updateRequestError.requestId));

        this.state = {
            error:
                newRequestError && updateRequestError?.requestId
                    ? { ...this.state.error, [updateRequestError.requestId]: newRequestError }
                    : this.state.error,
            data: updateCacheData ? updateCacheData(this.state.data) : this.state.data,
        };
    }

    private subscribeToDevtools() {
        // TODO: React to all messages
        this.devtools?.subscribe((message) => {
            if (message.type === 'DISPATCH' && message.payload.type === 'JUMP_TO_ACTION') {
                this.state = JSON.parse(message.state);
            }
        });
    }
}

export { InMemoryCache, CacheState };
