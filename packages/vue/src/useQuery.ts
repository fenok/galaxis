import { NonUndefined, Query, ObservableQuery, ObservableQueryState, Resource, Client, Cache } from '@galaxis/core';
import { useClient } from './useClientProvider';
import { computed, onServerPrefetch, onUnmounted, onMounted, reactive, toRefs, watch } from 'vue';

export function useQuery<
    TCacheData extends NonUndefined,
    TData extends NonUndefined,
    TError extends Error,
    TResource extends Resource,
>(query: () => Query<TCacheData, TData, TError, TResource> | undefined) {
    const client = useClient<Client<TCacheData, Cache<TCacheData>, TData, TError, TResource>>();
    const queryRef = computed(query);

    const observableQuery = new ObservableQuery<TCacheData, TData, TError, TResource>(() => {
        updateState(observableQuery.getState());
    });

    observableQuery.setOptions(client, queryRef.value);
    const state = reactive(observableQuery.getState());

    watch(queryRef, (nextQuery) => {
        observableQuery.setOptions(client, nextQuery);
        updateState(observableQuery.getState());

        startObservableQuery();
    });

    onMounted(() => {
        startObservableQuery();
    });

    onServerPrefetch(() => {
        return observableQuery.start();
    });

    onUnmounted(() => {
        observableQuery.dispose();
    });

    function startObservableQuery() {
        void observableQuery.start()?.catch(() => {
            // Prevent unnecessary uncaught error message
        });
    }

    function updateState(nextState: ObservableQueryState<TData, TError>) {
        Object.assign(state, nextState);
    }

    return { ...toRefs(state), refetch: observableQuery.refetch };
}
