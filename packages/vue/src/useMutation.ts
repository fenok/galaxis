import {
    Mutation,
    NonUndefined,
    ObservableMutation,
    ObservableMutationState,
    Resource,
    Client,
    Cache,
} from '@galaxis/core';
import { useClient } from './useClientProvider';
import { computed, onUnmounted, reactive, toRefs, watch } from 'vue';

export function useMutation<
    TCacheData extends NonUndefined,
    TData extends NonUndefined,
    TError extends Error,
    TResource extends Resource,
>(mutation: () => Mutation<TCacheData, TData, TError, TResource> | undefined) {
    const client = useClient<Client<TCacheData, Cache<TCacheData>, TData, TError, TResource>>();
    const mutationRef = computed(mutation);

    const observableMutation = new ObservableMutation<TCacheData, TData, TError, TResource>(() => {
        updateState(observableMutation.getState());
    });

    observableMutation.setOptions(client, mutationRef.value);
    let state = reactive(observableMutation.getState());

    watch(mutationRef, (nextMutation) => {
        observableMutation.setOptions(client, nextMutation);
    });

    onUnmounted(() => {
        observableMutation.dispose();
    });

    function updateState(nextState: ObservableMutationState<TData, TError>) {
        state = Object.assign(state, nextState);
    }

    return [observableMutation.execute, { ...toRefs(state), reset: observableMutation.reset }] as const;
}
