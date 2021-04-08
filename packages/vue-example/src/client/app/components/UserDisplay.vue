<template>
    <div>User display: {{ loading }}</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useQuery } from '../vue/useQuery';
import { userQuery } from '../requests/user';

export default defineComponent({
    setup() {
        const { loading } = useQuery(userQuery({ requestParams: { pathParams: { id: 1 } } }));

        return { loading };
    },
});
</script>
