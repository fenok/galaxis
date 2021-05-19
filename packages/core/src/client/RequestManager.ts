import { QueryManager, QueryManagerState } from './QueryManager';
import { MutationManager, MutationManagerResult } from './MutationManager';
import { Mutation, NonUndefined } from '../types';
import { QueryProcessor } from './QueryProcessor';
import { MutationProcessor } from './MutationProcessor';
import { DefaultsMerger } from './DefaultsMerger';

export interface RequestManagerOptions<C extends NonUndefined> {
    queryProcessor: QueryProcessor<C>;
    mutationProcessor: MutationProcessor<C>;
    defaultsMerger: DefaultsMerger;
}

export class RequestManager<
    C extends NonUndefined = NonUndefined,
    BD extends NonUndefined = NonUndefined,
    BE extends Error = Error,
    BR = unknown
> {
    private managedRequests = new Set<{ purge(): void }>();
    private queryProcessor: QueryProcessor<C>;
    private mutationProcessor: MutationProcessor<C>;
    private defaultsMerger: DefaultsMerger;

    public constructor({ queryProcessor, mutationProcessor, defaultsMerger }: RequestManagerOptions<C>) {
        this.queryProcessor = queryProcessor;
        this.mutationProcessor = mutationProcessor;
        this.defaultsMerger = defaultsMerger;
    }

    public getQueryManager<D extends BD, E extends BE, R extends BR>(
        onChange: (result: QueryManagerState<D, E>) => void,
    ) {
        const queryManager = new QueryManager<C, D, E, R>({
            queryProcessor: this.queryProcessor,
            defaultsMerger: this.defaultsMerger,
            onChange,
            onDispose: () => {
                this.managedRequests.delete(queryManager);
            },
        });

        this.managedRequests.add(queryManager);

        return queryManager;
    }

    public manageMutation<D extends BD, E extends BE, R extends BR>(
        mutation: Mutation<C, D, E, R> | undefined,
        onChange: (result: MutationManagerResult<D, E>) => void,
    ): [MutationManagerResult<D, E>, () => void] {
        const mutationManager = new MutationManager({
            mutation: this.defaultsMerger.getMergedMutation(mutation),
            mutationProcessor: this.mutationProcessor,
            onChange: onChange,
        });

        this.managedRequests.add(mutationManager);

        return [
            mutationManager.getResult(),
            () => {
                mutationManager.cleanup();
                this.managedRequests.delete(mutationManager);
            },
        ];
    }

    public purge() {
        this.managedRequests.forEach((request) => request.purge());
    }
}
