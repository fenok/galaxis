import { NonUndefined, Query, ObservableQuery, ObservableQueryState, Resource } from '@galaxis/core';
import { useClient } from './useClientProvider';
import { computed, onServerPrefetch, onUnmounted, onUpdated, onMounted, reactive, toRefs, watch } from 'vue';

export function useQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R extends Resource>(
    query: () => Query<C, D, E, R> | undefined,
) {
    const client = useClient();
    const queryRef = computed(query);

    const observableQuery = new ObservableQuery<C, D, E, R>(() => {
        updateState(observableQuery.getState());
    });

    observableQuery.setOptions(client, queryRef.value);
    let state = reactive(observableQuery.getState());

    watch(queryRef, (nextQuery) => {
        observableQuery.setOptions(client, nextQuery);
        updateState(observableQuery.getState());
    });

    onMounted(() => {
        void observableQuery.start()?.catch(() => {
            // Prevent unnecessary uncaught error message
        });
    });

    onUpdated(() => {
        void observableQuery.start()?.catch(() => {
            // Prevent unnecessary uncaught error message
        });
    });

    onServerPrefetch(() => {
        return observableQuery.start();
    });

    onUnmounted(() => {
        observableQuery.dispose();
    });

    function updateState(nextState: ObservableQueryState<D, E>) {
        state = Object.assign(state, nextState);
    }

    return { ...toRefs(state), refetch: observableQuery.refetch };
}
