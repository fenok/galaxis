import { devTools, ReduxDevTools } from './devTools';
import { RC } from '../request/types';

interface CacheState<C = any> {
    requestStates: { [id: string]: RequestState | undefined };
    sharedData: C;
}

interface SerializableCacheState<C = any> {
    requestStates: { [id: string]: SerializableRequestState | undefined };
    sharedData: C;
}

interface RequestState<D extends RC = any, E extends Error = Error> {
    loading: boolean;
    error?: E | Error; // Regular error can always slip through
    data?: D;
}

interface SerializableRequestState<D extends RC = any, E extends object = object> {
    loading: boolean;
    error?: E;
    data?: D;
}

interface CacheOptions {
    serializeError(error: Error): object;
    deserializeError(errorObject: object): Error;
    initialSerializableState?: SerializableCacheState;
    enableDevTools?: boolean;
    enableDataDuplication?: boolean;
}

class Cache {
    public static readonly INITIAL_STATE: CacheState = {
        requestStates: {},
        sharedData: {},
    };

    private readonly devtools: ReduxDevTools | null;

    private _state = Cache.INITIAL_STATE;

    private subscribers: ((state: CacheState) => void)[] = [];

    private readonly enableDataDuplication: boolean;
    private readonly serializeError: (error: Error) => object;
    private readonly deserializeError: (errorObject: object) => Error;

    constructor({
        serializeError,
        deserializeError,
        initialSerializableState,
        enableDataDuplication,
        enableDevTools,
    }: CacheOptions) {
        this.serializeError = serializeError;
        this.deserializeError = deserializeError;

        this.enableDataDuplication = Boolean(enableDataDuplication);

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

    private set state(newState: CacheState) {
        this._state = newState;
        this.subscribers.forEach(subscriber => subscriber(newState));
    }

    private get state() {
        return this._state;
    }

    public getState() {
        return this.state;
    }

    public getSerializableState(): SerializableCacheState {
        const serializableRequestStates = Object.fromEntries(
            Object.entries(this.state.requestStates).map(([id, state]) => [
                id,
                state ? { ...state, error: state.error ? this.serializeError(state.error) : state.error } : state,
            ]),
        );

        return {
            ...this.state,
            requestStates: serializableRequestStates,
        };
    }

    private deserializeState(serializableState: SerializableCacheState): CacheState {
        const deserializedRequestStates = Object.fromEntries(
            Object.entries(serializableState.requestStates).map(([id, state]) => [
                id,
                state ? { ...state, error: state.error ? this.deserializeError(state.error) : state.error } : state,
            ]),
        );

        return {
            ...serializableState,
            requestStates: deserializedRequestStates,
        };
    }

    public subscribe(callback: (state: CacheState) => void) {
        this.subscribers.push(callback);

        return () => {
            this.subscribers = this.subscribers.filter(subscriber => subscriber !== callback);
        };
    }

    public purge() {
        this.state = Cache.INITIAL_STATE;
    }

    public onQueryStart(id: string) {
        this.updateState({ id, state: { loading: true, error: undefined } });
        this.devtools?.send({ type: 'QUERY_START', id }, this.state);
    }

    public onQueryFail(id: string, error: Error) {
        this.updateState({ id, state: { loading: false, error } });
        this.devtools?.send({ type: 'QUERY_FAIL', id, error }, this.state);
    }

    public onQuerySuccess(id: string, data: any, sharedData?: any) {
        const dataToWrite = sharedData === undefined || this.enableDataDuplication ? data : undefined;

        this.updateState({ id, state: { loading: false, data: dataToWrite, error: undefined }, sharedData });
        this.devtools?.send({ type: 'QUERY_SUCCESS', id, data, sharedData }, this.state);
    }

    public onMutateSuccess(id: string, data: any, sharedData?: any) {
        this.updateState({ sharedData }); // Not error, only sharedData affects state
        this.devtools?.send({ type: 'MUTATE_SUCCESS', id, data, sharedData }, this.state);
    }

    private updateState({ id, state, sharedData }: { id?: string; state?: RequestState; sharedData?: any } = {}) {
        this.state = {
            ...this.state,
            requestStates:
                id !== undefined && state !== undefined
                    ? {
                          ...this.state.requestStates,
                          [id]: {
                              ...(this.state.requestStates[id] || {}),
                              ...state,
                          },
                      }
                    : this.state.requestStates,
            sharedData: sharedData !== undefined ? sharedData : this.state.sharedData,
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

export { Cache, CacheState, RequestState, SerializableCacheState, SerializableRequestState };
