<template>
    <div>User display: {{ data }}</div>
    <div>Loading: {{ loading }}</div>
    <button @click="iterateUser">Iterate user</button>
    <button @click="refetch">Refetch</button>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useQuery } from '../vue/useQuery';
import { userQuery } from '../requests/user';

export default defineComponent({
    setup() {
        const currentId = ref(1);

        const { loading, data, refetch } = useQuery(() =>
            userQuery({ resource: { pathParams: { id: currentId.value } } }),
        );

        return { loading, data, currentId, refetch };
    },
    methods: {
        iterateUser() {
            this.currentId = this.currentId + 1;
        },
    },
});
</script>
