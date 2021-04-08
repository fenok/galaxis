<template>
    <user-display></user-display>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Client } from '@galaxis/core';
import UserDisplay from './UserDisplay.vue';
import { useClientProvider } from '../vue/useClientProvider';

export default defineComponent({
    components: { UserDisplay },
    props: {
        client: {
            type: Client,
            required: true,
        },
    },
    setup(props) {
        useClientProvider(props.client);
    },
});
</script>
