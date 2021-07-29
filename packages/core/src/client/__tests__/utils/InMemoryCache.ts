import { Cache, NonUndefined, UpdateOptions } from '@galaxis/core';

interface CacheState<TCacheData extends NonUndefined, TBaseError = Error> {
    data: TCacheData;
    errors: Record<string, TBaseError | undefined>;
}

interface SplitState<TCacheData extends NonUndefined, TBaseError = Error> extends CacheState<TCacheData, TBaseError> {
    splitters: Set<unknown>;
}

interface CacheOptions<C extends NonUndefined> {
    emptyData: C;
    initialState?: CacheState<C, Error>;
}

class InMemoryCache<TCacheData extends NonUndefined> implements Cache<TCacheData> {
    private splitStates: SplitState<TCacheData>[];
    private emptyData: TCacheData;

    private subscribers: Set<(state: CacheState<TCacheData>) => void> = new Set();

    constructor({ emptyData, initialState }: CacheOptions<TCacheData>) {
        this.emptyData = emptyData;

        this.splitStates = [
            {
                errors: {},
                data: this.emptyData,
                splitters: new Set(),
                ...initialState,
            },
        ];
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
    }

    public clear() {
        this.splitStates = [{ errors: {}, data: this.emptyData, splitters: new Set() }];
        this.notifySubscribers();
    }

    public getData() {
        return this.getState().data;
    }

    public getError(requestId: string): Error | undefined {
        return this.getState().errors[requestId];
    }

    public extract(): CacheState<TCacheData, Error> {
        const originalState = this.splitStates[0];

        return {
            data: originalState.data,
            errors: originalState.errors,
        };
    }

    private notifySubscribers() {
        this.subscribers.forEach((subscriber) => subscriber(this.getState()));
    }

    private getState() {
        return this.splitStates[this.splitStates.length - 1];
    }

    private updateSplitStates({ data, errors, clearSplitFor, createSplitFor }: UpdateOptions<TCacheData>) {
        if (clearSplitFor !== undefined) {
            this.splitStates = this.splitStates.filter((splitState) => !splitState.splitters.has(clearSplitFor));
        }

        for (let index = 0; index < this.splitStates.length; index++) {
            const splitState = this.splitStates[index];

            if (createSplitFor !== undefined && index % 2 === 0) {
                this.splitStates.splice(index, 0, {
                    ...splitState,
                    splitters: new Set(splitState.splitters),
                });
            } else if (createSplitFor === undefined || index % 2 !== 0) {
                if (data) {
                    splitState.data = data(splitState.data);
                }
                if (errors) {
                    splitState.errors = this.insertErrors(splitState.errors, errors);
                }
                if (createSplitFor !== undefined) {
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
}

export { InMemoryCache, CacheState };
