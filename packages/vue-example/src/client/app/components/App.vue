<template>
    <user-display></user-display>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Client, useClientProvider } from '@galaxis/vue';
import UserDisplay from './UserDisplay.vue';

export default defineComponent({
    components: { UserDisplay },
    props: {
        client: {
            type: Client,
            required: true,
        },
    },
    setup(props) {
        useClientProvider({ client: props.client });
    },
});
</script>
