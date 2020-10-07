import { devTools, ReduxDevTools } from './devTools';
import { NonUndefined } from '../request';

interface CacheState<D extends NonUndefined = null, E = Error> {
    data: D;
    loading: { [id: string]: string[] | undefined };
    error: { [id: string]: E | undefined };
}

type SerializableCacheState<D extends NonUndefined = null> = CacheState<D, object>;

interface RequestState<D extends NonUndefined = null, E extends Error = Error> {
    loading: string[];
    error?: E | Error; // Regular error can always slip through
    data?: D;
}

interface CacheOptions<D extends NonUndefined = null> {
    serializeError(error: Error): object;
    deserializeError(errorObject: object): Error;
    initialSerializableState?: SerializableCacheState<D>;
    enableDevTools?: boolean;
}

class Cache<D extends NonUndefined = null> {
    public static readonly INITIAL_STATE: CacheState<any, any> = {
        loading: {},
        error: {},
        data: undefined,
    };

    private readonly devtools: ReduxDevTools | null;

    private _state: CacheState<D> = Cache.INITIAL_STATE;

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

    public getState() {
        return this.state;
    }

    public getSerializableState(): SerializableCacheState<D> {
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
        this.state = initialSerializableState ? this.deserializeState(initialSerializableState) : Cache.INITIAL_STATE;
    }

    public onQueryStart(opts: { requestId: string; requesterId: string; cacheData?: D }) {
        this.updateState({
            requestState: {
                id: opts.requestId,
                error: this.state.error[opts.requesterId],
                loading: [opts.requesterId],
            },
            data: opts.cacheData,
        });
        this.devtools?.send({ type: 'QUERY_START', ...opts }, this.state);
    }

    public onQueryRequesterAdd(opts: { requestId: string; requesterId: string }) {
        const currentRequesterIds = this.state.loading[opts.requesterId] ?? [];

        if (!currentRequesterIds.includes(opts.requesterId)) {
            this.updateState({
                requestState: {
                    id: opts.requestId,
                    error: this.state.error[opts.requesterId],
                    loading: [...currentRequesterIds, opts.requesterId],
                },
            });
            this.devtools?.send({ type: 'QUERY_REQUESTER_ADD', ...opts }, this.state);
        }
    }

    public onQueryRequesterRemove(opts: { requestId: string; requesterId: string }) {
        const currentRequesterIds = this.state.loading[opts.requesterId] ?? [];

        if (currentRequesterIds.includes(opts.requesterId)) {
            this.updateState({
                requestState: {
                    id: opts.requestId,
                    error: this.state.error[opts.requesterId],
                    loading: currentRequesterIds.filter(id => id !== opts.requesterId),
                },
            });
            this.devtools?.send({ type: 'QUERY_REQUESTER_REMOVE', ...opts }, this.state);
        }
    }

    public onQueryFail(opts: { requestId: string; requesterId: string; error: Error; cacheData?: D }) {
        this.updateState({
            requestState: { id: opts.requestId, loading: [], error: opts.error },
            data: opts.cacheData,
        });
        this.devtools?.send({ type: 'QUERY_FAIL', ...opts }, this.state);
    }

    public onQuerySuccess(opts: { requestId: string; requesterId: string; cacheData: D }) {
        this.updateState({
            requestState: {
                id: opts.requestId,
                loading: [],
                error: undefined,
            },
            data: opts.cacheData,
        });
        this.devtools?.send({ type: 'QUERY_SUCCESS', ...opts }, this.state);
    }

    public onMutateStart(opts: { cacheData?: D }) {
        this.updateState({ data: opts.cacheData });
        this.devtools?.send({ type: 'MUTATE_START', ...opts }, this.state);
    }

    public onMutateFail(opts: { cacheData?: D }) {
        this.updateState({ data: opts.cacheData });
        this.devtools?.send({ type: 'MUTATE_FAIL', ...opts }, this.state);
    }

    public onMutateSuccess(opts: { cacheData: D }) {
        this.updateState({ data: opts.cacheData });
        this.devtools?.send({ type: 'MUTATE_SUCCESS', ...opts }, this.state);
    }

    private updateState({
        requestState,
        data,
    }: {
        requestState?: {
            id: string;
            error: Error | undefined;
            loading: string[];
        };
        data?: D;
    }) {
        this.state = {
            loading: requestState
                ? {
                      ...this.state.loading,
                      [requestState.id]: requestState.loading,
                  }
                : this.state.loading,
            error: requestState
                ? {
                      ...this.state.error,
                      [requestState.id]: requestState.error,
                  }
                : this.state.error,
            data: data !== undefined ? data : this.state.data,
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

export { Cache, CacheState, RequestState, SerializableCacheState };
