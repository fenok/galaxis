import { NonUndefined, Query, QueryManagerResult } from '@galaxis/core';
import { useClient } from './useClientProvider';
import { onServerPrefetch } from 'vue';

export function useQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    query: Query<C, D, E, R>,
): QueryManagerResult<D, E> {
    const client = useClient();

    const [result, dispose] = client.manageQuery(query, () => {});

    // onServerPrefetch(() => {
    //     return client.fetchQuery(query);
    // });

    return result;
}
