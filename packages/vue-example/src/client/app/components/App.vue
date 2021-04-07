<template>
    <div>Counter: {{ user }}</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { User, userQuery } from '../requests/user';
import { Client } from '@galaxis/core';

export default defineComponent({
    props: {
        client: {
            type: Client,
            required: true,
        },
    },
    data(): { user: User | undefined } {
        const user = this.$props.client.readQuery(userQuery({ requestParams: { pathParams: { id: 1 } } })).data;

        return {
            user,
        };
    },
    mounted() {
        const result = this.$props.client.query(userQuery({ requestParams: { pathParams: { id: 1 } } }), (state) => {
            this.$data.user = state.data;
        });

        this.$data.user = result.data;
    },
    serverPrefetch() {
        const result = this.client.query(userQuery({ requestParams: { pathParams: { id: 1 } } }), (state) => {
            this.$data.user = state.data;
        });
        return result.request || Promise.resolve();
    },
});
</script>
