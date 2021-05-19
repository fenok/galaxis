import { NonUndefined, Query, QueryManagerState } from '@galaxis/core';
import { useClient } from './useClientProvider';
import { computed, onServerPrefetch, onUnmounted, reactive, toRefs, watch } from 'vue';

export function useQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    query: () => Query<C, D, E, R>,
) {
    const client = useClient<C>();
    const queryRef = computed(query);

    let request: Promise<D> | undefined;
    let areUpdatesPaused = false;

    const queryManager = client.getQueryManager<D, E, R>((nextState: QueryManagerState<D, E>) => {
        if (!areUpdatesPaused) {
            updateState(nextState);
        }
    });
    let state = reactive(queryManager.getState());

    processQuery(queryRef.value);

    watch(queryRef, (nextQuery) => {
        processQuery(nextQuery);
    });

    onServerPrefetch(() => {
        return request;
    });

    onUnmounted(() => {
        queryManager.dispose();
    });

    function processQuery(query: Query<C, D, E, R>) {
        areUpdatesPaused = true;

        const setQueryResult = queryManager.setQuery(query);

        if (setQueryResult && setQueryResult.request) {
            request = setQueryResult.request;
        }

        areUpdatesPaused = false;

        updateState(queryManager.getState());
    }

    function updateState(nextState: QueryManagerState<D, E>) {
        state = Object.assign(state, nextState);
    }

    return { ...toRefs(state), ...queryManager.getApi() };
}
