import { devTools, ReduxDevTools } from './devTools';
import { Cache, NonUndefined, UpdateOptions } from '@galaxis/core';
import { serializeError, deserializeError, ErrorObject } from 'serialize-error';

interface CacheState<TCacheData extends NonUndefined, TBaseError = Error> {
    data: TCacheData;
    errors: Record<string, TBaseError | undefined>;
}

interface SplitState<TCacheData extends NonUndefined, TBaseError = Error> extends CacheState<TCacheData, TBaseError> {
    splitters: Set<unknown>;
}

interface CacheOptions<C extends NonUndefined> {
    emptyData: C;
    initialState?: CacheState<C, ErrorObject>;
    enableDevTools?: boolean;
}

class InMemoryCache<TCacheData extends NonUndefined> implements Cache<TCacheData> {
    private readonly devtools: ReduxDevTools | null;

    private splitStates: SplitState<TCacheData>[];
    private emptyData: TCacheData;

    private subscribers: Set<(state: CacheState<TCacheData>) => void> = new Set();

    constructor({ emptyData, initialState, enableDevTools }: CacheOptions<TCacheData>) {
        this.emptyData = emptyData;

        this.splitStates = [
            {
                errors: {},
                data: this.emptyData,
                splitters: new Set(),
                ...(initialState && this.deserializeState(initialState)),
            },
        ];

        this.devtools =
            enableDevTools && devTools
                ? devTools.connect({
                      serialize: { replacer: (_, value) => (value instanceof Error ? serializeError(value) : value) },
                  })
                : null;
        this.subscribeToDevtools();

        this.devtools?.send({ type: 'INIT', state: this.getState() }, this.getState());
    }

    public subscribe(callback: (state: CacheState<TCacheData>) => void) {
        this.subscribers.add(callback);

        return () => {
            this.subscribers.delete(callback);
        };
    }

    public update(opts: UpdateOptions<TCacheData>) {
        this.updateSplitStates(opts);
        this.notifySubscribers();
        this.devtools?.send({ type: 'UPDATE', ...opts }, this.getState());
    }

    public clear() {
        this.splitStates = [{ errors: {}, data: this.emptyData, splitters: new Set() }];
        this.notifySubscribers();
        this.devtools?.send({ type: 'CLEAR' }, this.getState());
    }

    public getData() {
        return this.getState().data;
    }

    public getError(requestId: string): Error | undefined {
        return this.getState().errors[requestId];
    }

    public extract(): CacheState<TCacheData, ErrorObject> {
        const originalState = this.splitStates[0];

        const serializableErrors = Object.fromEntries(
            Object.entries(originalState.errors).map(([id, error]) => [id, error ? serializeError(error) : undefined]),
        );

        return {
            data: originalState.data,
            errors: serializableErrors,
        };
    }

    private notifySubscribers() {
        this.subscribers.forEach((subscriber) => subscriber(this.getState()));
    }

    private getState() {
        return this.splitStates[this.splitStates.length - 1];
    }

    private deserializeState(serializableState: CacheState<TCacheData, ErrorObject>): CacheState<TCacheData> {
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

    private updateSplitStates({ data, errors, clearSplitFor, createSplitFor }: UpdateOptions<TCacheData>) {
        if (clearSplitFor) {
            this.splitStates = this.splitStates.filter((splitState) => !splitState.splitters.has(clearSplitFor));
        }

        for (let index = 0; index < this.splitStates.length; index++) {
            const splitState = this.splitStates[index];

            if (createSplitFor && index % 2 === 0) {
                this.splitStates.splice(index, 0, {
                    ...splitState,
                    splitters: new Set(splitState.splitters),
                });
            } else if (!createSplitFor || index % 2 !== 0) {
                if (data) {
                    splitState.data = data(splitState.data);
                }
                if (errors) {
                    splitState.errors = this.insertErrors(splitState.errors, errors);
                }
                if (createSplitFor) {
                    splitState.splitters.add(createSplitFor);
                }
            }
        }
    }

    private insertErrors(
        stateErrors: Record<string, Error | undefined>,
        errors: Record<string, (prevError: Error | undefined) => Error | undefined>,
    ) {
        const result: Record<string, Error | undefined> = {};

        Object.keys(stateErrors).forEach((key) => {
            if (!(key in errors)) {
                result[key] = stateErrors[key];
            }
        });

        Object.keys(errors).forEach((key) => {
            const newError = errors[key](stateErrors[key]);

            if (newError) {
                result[key] = newError;
            }
        });

        return result;
    }

    private subscribeToDevtools() {
        // TODO: React to devtools messages
    }
}

export { InMemoryCache, CacheState, ErrorObject };
