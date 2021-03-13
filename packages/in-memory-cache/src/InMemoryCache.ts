import { devTools, ReduxDevTools } from './devTools';
import { Cache, NonUndefined, UpdateStateOptions } from '@fetcher/core';
import { serializeError, deserializeError, ErrorObject } from 'serialize-error';

interface CacheState<C extends NonUndefined, E = Error> {
    data: C;
    error: { [id: string]: E | undefined };
}

interface CacheOptions<C extends NonUndefined> {
    emptyData: C;
    initialState?: CacheState<C, ErrorObject>;
    enableDevTools?: boolean;
}

class InMemoryCache<C extends NonUndefined> implements Cache<C> {
    private readonly devtools: ReduxDevTools | null;

    private _state: CacheState<C>;
    private emptyData: C;

    private subscribers: ((state: CacheState<C>) => void)[] = [];

    constructor({ emptyData, initialState, enableDevTools }: CacheOptions<C>) {
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

    private set state(newState: CacheState<C>) {
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

    public extract(): CacheState<C, ErrorObject> {
        const serializableErrors = Object.fromEntries(
            Object.entries(this.state.error).map(([id, error]) => [id, error ? serializeError(error) : undefined]),
        );

        return {
            ...this.state,
            error: serializableErrors,
        };
    }

    private deserializeState(serializableState: CacheState<C, ErrorObject>): CacheState<C> {
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

    public subscribe(callback: (state: CacheState<C>) => void) {
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

    public updateState(opts: UpdateStateOptions<C>) {
        this.updateStateInner(opts);
        this.devtools?.send({ type: 'UPDATE', ...opts }, this.state);
    }

    private updateStateInner({ updateCacheData, updateRequestError }: UpdateStateOptions<C>) {
        const newData = updateCacheData ? updateCacheData(this.state.data) : this.state.data;
        const currentRequestError = updateRequestError ? this.getRequestError(updateRequestError.requestId) : undefined;
        const newRequestError = updateRequestError ? updateRequestError.update(currentRequestError) : undefined;

        if (newData !== this.state.data || newRequestError !== currentRequestError) {
            this.state = {
                error: updateRequestError
                    ? {
                          ...this.state.error,
                          [updateRequestError.requestId]: newRequestError,
                      }
                    : this.state.error,
                data: newData,
            };
        }
    }

    private subscribeToDevtools() {
        // TODO: React to all messages
        this.devtools?.subscribe((message) => {
            if (message.type === 'DISPATCH' && message.payload.type === 'JUMP_TO_ACTION') {
                this.state = JSON.parse(message.state) as CacheState<C>;
            }
        });
    }
}

export { InMemoryCache, CacheState };
