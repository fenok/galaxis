import { Cache } from '../cache';
import { NonUndefined, YarfRequest } from '../request';
import { QueryProcessor, QueryOptions, QueryResult } from './QueryProcessor';
import { MutationProcessor, MutateOptions } from './MutationProcessor';
import { NetworkRequestQueue } from './NetworkRequestQueue';

interface ClientOptions<C extends NonUndefined = null> {
    cache: Cache<C>;
}

interface GetStateOptions {
    requesterId: string;
}

interface RequestState<D extends NonUndefined = null, E extends Error = Error> {
    loading: string[];
    error?: E | Error; // Regular error can always slip through
    data?: D;
}

class Client<C extends NonUndefined> {
    private readonly cache: Cache<C>;
    private idCounter = 1;
    private queryProcessor: QueryProcessor<C>;
    private mutationProcessor: MutationProcessor<C>;

    constructor({ cache }: ClientOptions<C>) {
        const networkRequestQueue = new NetworkRequestQueue<C>();
        this.cache = cache;
        this.queryProcessor = new QueryProcessor({ cache, networkRequestQueue });
        this.mutationProcessor = new MutationProcessor({ cache, networkRequestQueue });
    }

    public generateId(): string {
        return String(this.idCounter++);
    }

    public resetId() {
        this.idCounter = 1;
    }

    public purge() {
        this.queryProcessor.purge();
        this.mutationProcessor.purge();
        this.cache.purge();
    }

    public subscribe<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requesterId: string,
        onChange: (state: RequestState<R, E>) => void,
    ) {
        return this.cache.subscribe(() => {
            onChange(this.getState(request, { requesterId }));
        });
    }

    public extract() {
        return this.cache.extract();
    }

    public enableDataRefetch() {
        this.queryProcessor.enableDataRefetch();
    }

    public getState<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        { requesterId }: GetStateOptions,
    ): RequestState<R, E> {
        return this.queryProcessor.getCompleteRequestState(request, requesterId);
    }

    public query<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        requestOptions: QueryOptions,
    ): QueryResult<R, E> {
        return this.queryProcessor.query(request, requestOptions);
    }

    public async mutate<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        mutateOptions: MutateOptions,
    ): Promise<R> {
        return this.mutationProcessor.mutate(request, mutateOptions).then(result => {
            request.refetchQueries?.forEach(requestData => {
                this.queryProcessor.query(requestData, {
                    requesterId: 'INTERNAL',
                    forceNetworkRequest: true,
                    disableNetworkRequestOptimization: true,
                });
            });

            return result;
        });
    }
}

export { Client, ClientOptions, RequestState };
