import { NonUndefined, Query, ObservableQuery, ObservableQueryState } from '@galaxis/core';
import { useClient } from './useClientProvider';
import { computed, onServerPrefetch, onUnmounted, onMounted, reactive, toRefs, watch } from 'vue';

export function useQuery<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
    query: () => Query<C, D, E, R>,
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
        void observableQuery.start();
    });

    onMounted(() => {
        void observableQuery.start();
    });

    onServerPrefetch(() => {
        return observableQuery.start();
    });

    onUnmounted(() => {
        observableQuery.stop();
    });

    function updateState(nextState: ObservableQueryState<D, E>) {
        state = Object.assign(state, nextState);
    }

    return { ...toRefs(state), refetch: observableQuery.refetch };
}
