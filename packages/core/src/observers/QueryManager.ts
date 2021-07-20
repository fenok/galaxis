// import { NonUndefined, Query } from '../types';
// import { QueryProcessor, QueryResult, QueryState } from '../client/QueryProcessor';
// import { logger } from '../logger';
// import { DefaultsMerger } from '../client/DefaultsMerger';
//
// export interface QueryManagerOptions<C extends NonUndefined, D extends NonUndefined, E extends Error> {
//     queryProcessor: QueryProcessor<C>;
//     defaultsMerger: DefaultsMerger;
//     onChange(result: QueryManagerState<D, E>): void;
//     onDispose(): void;
// }
//
// export interface QueryManagerExternalState<D extends NonUndefined, E extends Error> {
//     data: D | undefined;
//     error: E | Error | undefined;
// }
//
// export interface QueryManagerState<D extends NonUndefined, E extends Error> {
//     loading: boolean;
//     data: D | undefined;
//     error: E | Error | undefined;
//     executed: boolean;
// }
//
// export type QueryManagerApi<D extends NonUndefined, E extends Error> = {
//     refetch: () => Promise<D>;
//     abort: () => void;
//     execute: () => QueryResult<D, E>;
//     reset: () => void;
// };
//
// export class QueryManager<C extends NonUndefined, D extends NonUndefined, E extends Error, R> {
//     private onChange?: (state: QueryManagerState<D, E>) => void;
//     private onDispose?: () => void;
//     private defaultsMerger: DefaultsMerger;
//     private query?: Query<C, D, E, R>;
//     private queryProcessor: QueryProcessor<C>;
//     private state: QueryManagerState<D, E> = {
//         loading: false,
//         data: undefined,
//         error: undefined,
//         executed: false,
//     };
//     private externalState?: QueryManagerExternalState<D, E>;
//     private abortController?: AbortController;
//     private softAbortController?: AbortController;
//     private networkRequestId = 1;
//     private unsubscribe?: () => void;
//     private cacheable = false;
//
//     constructor({ onChange, onDispose, queryProcessor, defaultsMerger }: QueryManagerOptions<C, D, E>) {
//         this.onChange = onChange;
//         this.onDispose = onDispose;
//         this.defaultsMerger = defaultsMerger;
//         this.queryProcessor = queryProcessor;
//     }
//
//     public getState(): QueryManagerState<D, E> {
//         return this.state;
//     }
//
//     public getApi(): QueryManagerApi<D, E> {
//         return {
//             refetch: this.refetch,
//             abort: this.abort,
//             execute: this.execute,
//             reset: this.reset,
//         };
//     }
//
//     public setQuery(query: Query<C, D, E, R> | undefined) {
//         this.query = this.defaultsMerger.getMergedQuery(query);
//
//         if (query && !query.lazy) {
//             return this.execute();
//         } else {
//             return this.reset();
//         }
//     }
//
//     public dispose() {
//         this.networkRequestId += 1;
//         this.unsubscribe?.();
//         this.softAbort();
//         this.onChange = undefined;
//         this.onDispose?.();
//         this.onDispose = undefined;
//     }
//
//     public purge() {
//         if (this.state.executed) {
//             this.execute();
//         }
//     }
//
//     private reset = () => {
//         this.networkRequestId += 1;
//         this.unsubscribe?.();
//         this.softAbort();
//         this.externalState = undefined;
//         this.cacheable = false;
//         this.setState({ loading: false, error: undefined, data: undefined, executed: false });
//     };
//
//     private abort = () => {
//         this.abortController?.abort();
//     };
//
//     private softAbort() {
//         this.softAbortController?.abort();
//     }
//
//     private execute = () => {
//         if (this.query) {
//             return this.executeInner(this.query);
//         }
//
//         throw new Error('No query to execute');
//     };
//
//     private refetch = () => {
//         if (this.state.executed && this.query) {
//             return this.fetchInner(this.query);
//         }
//
//         return Promise.reject(new Error('No query or the query is not executed yet.'));
//     };
//
//     private executeInner(nonPatchedQuery: Query<C, D, E, R>): QueryResult<D, E> {
//         const networkRequestId = ++this.networkRequestId;
//
//         this.unsubscribe?.();
//         this.softAbort();
//
//         const query = this.getPatchedQuery(nonPatchedQuery);
//
//         const queryResult = this.queryProcessor.query(query, this.onExternalChange.bind(this));
//
//         this.cacheable = queryResult.cacheable;
//
//         this.externalState = { data: queryResult.data, error: queryResult.error };
//
//         this.setState({
//             executed: true,
//             loading: queryResult.requestRequired,
//             data: queryResult.data,
//             error: queryResult.error,
//         });
//
//         this.unsubscribe = queryResult.unsubscribe;
//
//         const result = {
//             ...queryResult,
//             request: queryResult.request && this.updateStateWithResult(queryResult.request, networkRequestId),
//         };
//
//         result.request && this.catchExecutionError(result.request, networkRequestId);
//
//         return { ...result, unsubscribe: undefined };
//     }
//
//     private fetchInner(nonPatchedQuery: Query<C, D, E, R>): Promise<D> {
//         const callId = ++this.networkRequestId;
//
//         this.softAbort();
//
//         const query = this.getPatchedQuery(nonPatchedQuery, true);
//
//         const request = this.queryProcessor.fetchQuery(query);
//         this.setState({ loading: true });
//
//         return this.updateStateWithResult(request, callId);
//     }
//
//     private getPatchedQuery(query: Query<C, D, E, R>, refetch?: boolean): Query<C, D, E, R> {
//         this.ensureAbortControllers();
//
//         return {
//             ...query,
//             abortSignal: this.abortController?.signal,
//             softAbortSignal: this.softAbortController?.signal,
//             forceRequestOnMerge: refetch || query.forceRequestOnMerge,
//         };
//     }
//
//     private updateStateWithResult(promise: Promise<D>, networkRequestId: number): Promise<D> {
//         return promise
//             .then((data) => {
//                 if (this.networkRequestId === networkRequestId) {
//                     this.setState({
//                         data: this.cacheable ? this.externalState?.data : data,
//                         error: undefined,
//                         loading: false,
//                     });
//                 }
//
//                 return data;
//             })
//             .catch((error: Error) => {
//                 if (this.networkRequestId === networkRequestId) {
//                     this.setState({ error: this.cacheable ? this.externalState?.error : error, loading: false });
//                 }
//
//                 throw error;
//             });
//     }
//
//     private catchExecutionError(promise: Promise<D>, callId: number): Promise<D | void> {
//         return promise.catch((error: Error) => {
//             if (this.networkRequestId === callId) {
//                 if (error !== this.state.error) {
//                     logger.warn(
//                         'Query request promise returned an error that is different from the cached one:',
//                         error,
//                     );
//                 }
//             }
//         });
//     }
//
//     private ensureAbortControllers() {
//         if (typeof AbortController !== 'undefined') {
//             if (!this.abortController || this.abortController.signal.aborted) {
//                 this.abortController = new AbortController();
//             }
//
//             if (!this.softAbortController || this.softAbortController.signal.aborted) {
//                 this.softAbortController = new AbortController();
//             }
//         }
//     }
//
//     private onExternalChange(queryState: QueryState<D, E>) {
//         const externalState = { data: queryState.data, error: queryState.error };
//         this.externalState = externalState;
//
//         if (!this.state.loading) {
//             this.setState(externalState);
//         }
//     }
//
//     private setState(state: Partial<QueryManagerState<D, E>>) {
//         const nextState = { ...this.state, ...state };
//         const shouldUpdate = !this.areStatesEqual(this.state, nextState);
//
//         this.state = nextState;
//
//         if (shouldUpdate) {
//             this.onChange?.(this.getState());
//         }
//     }
//
//     private areStatesEqual(a: QueryManagerState<D, E>, b: QueryManagerState<D, E>) {
//         return a.loading === b.loading && a.data === b.data && a.error === b.error && a.executed === b.executed;
//     }
// }
