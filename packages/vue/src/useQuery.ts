import { NonUndefined, Query, ObservableQuery, ObservableQueryState, Resource } from '@galaxis/core';
import { useClient } from './useClientProvider';
import { computed, onServerPrefetch, onUnmounted, onUpdated, onMounted, reactive, toRefs, watch } from 'vue';

export function useQuery<
    TCacheData extends NonUndefined,
    TData extends NonUndefined,
    TError extends Error,
    TResource extends Resource
>(query: () => Query<TCacheData, TData, TError, TResource> | undefined) {
    const client = useClient();
    const queryRef = computed(query);

    const observableQuery = new ObservableQuery<TCacheData, TData, TError, TResource>(() => {
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

    function updateState(nextState: ObservableQueryState<TData, TError>) {
        state = Object.assign(state, nextState);
    }

    return { ...toRefs(state), refetch: observableQuery.refetch };
}
