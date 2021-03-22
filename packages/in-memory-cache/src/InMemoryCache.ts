import { devTools, ReduxDevTools } from './devTools';
import { Cache, NonUndefined, UpdateOptions } from '@fetcher/core';
import { serializeError, deserializeError, ErrorObject } from 'serialize-error';

interface CacheState<C extends NonUndefined, E = Error> {
    data: C;
    errors: { [id: string]: E | undefined };
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
            errors: {},
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

    public getData() {
        return this.state.data;
    }

    public getError(requestId: string): Error | undefined {
        return this.state.errors[requestId];
    }

    public extract(): CacheState<C, ErrorObject> {
        const serializableErrors = Object.fromEntries(
            Object.entries(this.state.errors).map(([id, error]) => [id, error ? serializeError(error) : undefined]),
        );

        return {
            ...this.state,
            errors: serializableErrors,
        };
    }

    private deserializeState(serializableState: CacheState<C, ErrorObject>): CacheState<C> {
        const deserializedErrors = Object.fromEntries(
            Object.entries(serializableState.errors).map(([id, error]) => [
                id,
                error ? deserializeError(error) : undefined,
            ]),
        );

        return {
            ...serializableState,
            errors: deserializedErrors,
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
            errors: {},
            data: this.emptyData,
        };
    }

    public update(opts: UpdateOptions<C>) {
        this.updateStateInner(opts);
        this.devtools?.send({ type: 'UPDATE', ...opts }, this.state);
    }

    private updateStateInner({ data, error }: UpdateOptions<C>) {
        this.state = {
            errors: error ? this.insertError(this.state.errors, error) : this.state.errors,
            data: data !== undefined ? data : this.state.data,
        };
    }

    private insertError(errors: Record<string, Error | undefined>, error: [string, Error | undefined]) {
        const result: Record<string, Error | undefined> = {};

        Object.keys(errors).forEach((key) => {
            if (key !== error[0]) {
                result[key] = errors[key];
            }
        });

        if (error[1]) {
            result[error[0]] = error[1];
        }

        return result;
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

export { InMemoryCache, CacheState, ErrorObject };
