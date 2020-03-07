import {serializeError, ErrorObject} from 'serialize-error';
import { devTools } from './devTools';

interface CacheState<C = any> {
    requestStates: {[id: string]: RequestState | undefined};
    sharedData: C;
}

interface RequestState<D = any> {
    loading: boolean;
    error?: ErrorObject,
    data?: D,
}

class Cache {
    public static readonly INITIAL_STATE: CacheState = {
        requestStates: {},
        sharedData: {}
    };

    private devtools = (process.env.NODE_ENV !== 'production' && devTools) ? devTools.connect() : null;

    private _state = Cache.INITIAL_STATE;
    private subscribers: ((state: CacheState) => void)[] = [];

    constructor(initialState?: CacheState) {
        this.subscribeToDevtools();
        this.devtools?.send({type: 'INIT', state: this.state}, this.state);

        if(initialState) {
            this.state = initialState;
            this.devtools?.send({type: 'HYDRATE', state: this.state}, this.state);
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

    public subscribe(callback: (state: CacheState) => void) {
        this.subscribers.push(callback);

        return () => {
            this.subscribers = this.subscribers.filter(subscriber => subscriber !== callback);
        }
    }

    public purge() {
        this.state = Cache.INITIAL_STATE;
    }

    public onQueryStart(id: string) {
        this.updateState({id, state: {loading: true, error: undefined}});
        this.devtools?.send({type: 'QUERY_START', id}, this.state);
    }

    public onQueryFail(id: string, error: Error) {
        const errorObj = serializeError(error);

        this.updateState({id, state: {loading: false, error: errorObj}});
        this.devtools?.send({type: 'QUERY_FAIL', id, error: errorObj}, this.state);
    }

    public onQuerySuccess(id: string, data: any, sharedData?: any) {
        this.updateState({id, state: {loading: false, data, error: undefined}, sharedData});
        this.devtools?.send({type: 'QUERY_SUCCESS', id, data, sharedData}, this.state);
    }

    public onMutateSuccess(id: string, data: any, sharedData?: any) {
        this.updateState({sharedData}); // Not error, only sharedData affects state
        this.devtools?.send({type: 'MUTATE_SUCCESS', id, data, sharedData}, this.state);
    }

    private updateState({id, state, sharedData}: {id?: string, state?: RequestState, sharedData?: any} = {}) {
        this.state = {
            ...this.state,
            requestStates: (id !== undefined && state !== undefined) ? {
                ...this.state.requestStates,
                [id]: {
                    ...(this.state.requestStates[id] || {}),
                    ...state
                }
            } : this.state.requestStates,
            sharedData: sharedData !== undefined ? sharedData : this.state.sharedData
        }
    }

    private subscribeToDevtools() {
        // TODO: React to all messages
        this.devtools?.subscribe((message) => {
            if(message.type === "DISPATCH" && message.payload.type === "JUMP_TO_ACTION") {
                this.state = JSON.parse(message.state);
            }
        })
    }
}

export {Cache, CacheState, RequestState}
