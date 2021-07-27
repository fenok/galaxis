import { Mutation, NonUndefined, ObservableMutation, ObservableMutationState, Resource } from '@galaxis/core';
import { useClient } from './useClientProvider';
import { computed, onUnmounted, reactive, toRefs, watch } from 'vue';

export function useMutation<C extends NonUndefined, D extends NonUndefined, E extends Error, R extends Resource>(
    mutation: () => Mutation<C, D, E, R> | undefined,
) {
    const client = useClient();
    const mutationRef = computed(mutation);

    const observableMutation = new ObservableMutation<C, D, E, R>(() => {
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

    function updateState(nextState: ObservableMutationState<D, E>) {
        state = Object.assign(state, nextState);
    }

    return [observableMutation.execute, { ...toRefs(state), reset: observableMutation.reset }] as const;
}
