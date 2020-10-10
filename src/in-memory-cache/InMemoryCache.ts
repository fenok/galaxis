import { devTools, ReduxDevTools } from './devTools';
import { Cache, NonUndefined, UpdateStateOpts, CacheRequestState } from '../core';

interface CacheState<D extends NonUndefined = null, E = Error> {
    data: D;
    loading: { [id: string]: string[] | undefined };
    error: { [id: string]: E | undefined };
}

type SerializableCacheState<D extends NonUndefined = null> = CacheState<D, object>;

interface CacheOptions<D extends NonUndefined = null> {
    serializeError(error: Error): object;
    deserializeError(errorObject: object): Error;
    initialSerializableState?: SerializableCacheState<D>;
    enableDevTools?: boolean;
}

class InMemoryCache<D extends NonUndefined = null> implements Cache<D> {
    public static readonly INITIAL_STATE: CacheState<any, any> = {
        loading: {},
        error: {},
        data: undefined,
    };

    private readonly devtools: ReduxDevTools | null;

    private _state: CacheState<D> = InMemoryCache.INITIAL_STATE;

    private subscribers: ((state: CacheState<D>) => void)[] = [];

    private readonly serializeError: (error: Error) => object;
    private readonly deserializeError: (errorObject: object) => Error;

    constructor({ serializeError, deserializeError, initialSerializableState, enableDevTools }: CacheOptions<D>) {
        this.serializeError = serializeError;
        this.deserializeError = deserializeError;

        this.devtools =
            enableDevTools && devTools
                ? devTools.connect({
                      serialize: { replacer: (_, value) => (value instanceof Error ? serializeError(value) : value) },
                  })
                : null;
        this.subscribeToDevtools();
        this.devtools?.send({ type: 'INIT', state: this.state }, this.state);

        if (initialSerializableState) {
            this.state = this.deserializeState(initialSerializableState);
            this.devtools?.send({ type: 'HYDRATE', state: initialSerializableState }, this.state);
        }
    }

    private set state(newState: CacheState<D>) {
        this._state = newState;
        this.subscribers.forEach(subscriber => subscriber(newState));
    }

    private get state() {
        return this._state;
    }

    public getCacheData() {
        return this.state.data;
    }

    public getRequestState(requestId: string): CacheRequestState {
        return {
            loading: this.state.loading[requestId] ?? [],
            error: this.state.error[requestId],
        };
    }

    public extract(): SerializableCacheState<D> {
        const serializableErrors = Object.fromEntries(
            Object.entries(this.state.error).map(([id, error]) => [id, error ? this.serializeError(error) : undefined]),
        );

        return {
            ...this.state,
            error: serializableErrors,
        };
    }

    private deserializeState(serializableState: SerializableCacheState<D>): CacheState<D> {
        const deserializedErrors = Object.fromEntries(
            Object.entries(serializableState.error).map(([id, error]) => [
                id,
                error ? this.deserializeError(error) : undefined,
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
            this.subscribers = this.subscribers.filter(subscriber => subscriber !== callback);
        };
    }

    public purge(initialSerializableState?: SerializableCacheState<D>) {
        this.state = initialSerializableState
            ? this.deserializeState(initialSerializableState)
            : InMemoryCache.INITIAL_STATE;
    }

    public updateState(opts: UpdateStateOpts<D>) {
        this.updateStateInner(opts);
        this.devtools?.send({ type: 'UPDATE', ...opts }, this.state);
    }

    private updateStateInner({ updateCacheData, updateRequestState }: UpdateStateOpts<D>) {
        const newRequestState = updateRequestState?.update(this.getRequestState(updateRequestState.requestId));

        this.state = {
            loading:
                newRequestState && updateRequestState?.requestId
                    ? { ...this.state.loading, [updateRequestState.requestId]: newRequestState.loading }
                    : this.state.loading,
            error:
                newRequestState && updateRequestState?.requestId
                    ? { ...this.state.error, [updateRequestState.requestId]: newRequestState.error }
                    : this.state.error,
            data: updateCacheData ? updateCacheData(this.state.data) : this.state.data,
        };
    }

    private subscribeToDevtools() {
        // TODO: React to all messages
        this.devtools?.subscribe(message => {
            if (message.type === 'DISPATCH' && message.payload.type === 'JUMP_TO_ACTION') {
                this.state = JSON.parse(message.state);
            }
        });
    }
}

export { InMemoryCache, CacheState, SerializableCacheState };
