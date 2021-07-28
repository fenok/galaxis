# Galaxis Vue

[![npm](https://img.shields.io/npm/v/@galaxis/react)](https://www.npmjs.com/package/@galaxis/react)

Vue bindings for [Galaxis](/README.md#galaxis-).

> ⚠ The API is fairly basic, because I have a very little experience with Vue.

## Installation

```
yarn add @galaxis/vue
```

This will also install and expose API of Galaxis [Core](/packages/core#galaxis-core).

The library is compiled to modern JS, but it should work in all reasonable browsers with the help of properly configured Babel.

Your client environment has to have `AbortController`. You might need to polyfill it.

You also need a version of Vue that supports Composition API.

## Public API

> ⚠ Anything that is not documented here is not considered a part of public API and may change at any time.

### `useClientProvider()`

`useClientProvider()` is used to configure and provide a <code>[Client](/packages/core#client)</code> instance for the rest of the application.

```vue
<template>
    <rest-of-the-app></rest-of-the-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Client, useClientProvider } from '@galaxis/vue';
import RestOfTheApp from './RestOfTheApp.vue';

export default defineComponent({
    components: { RestOfTheApp },
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
```

#### Arguments

##### `ClientProviderOptions`

| Name                         | Type                                         | Description                                                                                                                                                                                                                                                                                                                          | Required |
| ---------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| client                       | <code>[Client](/packages/core#client)</code> | A `Client` instance that will be used by the application.                                                                                                                                                                                                                                                                            | Yes      |
| preventOnHydrateCompleteCall | `boolean`                                    | By default, <code>[client.onHydrateComplete()](/packages/core#clientonhydratecomplete)</code> will be called in the `onMounted` lifecycle hook. It should be fine in most cases, but you can use this option as an escape hatch and call <code>[client.onHydrateComplete()](/packages/core#clientonhydratecomplete)</code> manually. | No       |

### `useClient()`

`useClient` is used to retrieve the [Client](/packages/core#client) instance that was passed to the <code>[Provider](#clientprovider)</code>. You can then use it to execute queries and mutations manually, access cache, etc.

```typescript
import { defineComponent } from 'vue';
import { useClient } from '@galaxis/vue';

export default defineComponent({
    setup() {
        const client = useClient();

        return { client };
    },
});
```

### `useQuery()`

`useQuery` is a thin wrapper for <code>[ObservableQuery](/packages/core#observablequery)</code>.

```typescript
import { defineComponent, ref } from 'vue';
import { useQuery } from '@galaxis/vue';
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
```

#### Arguments

| Name  | Type                                             | Description          | Required |
| ----- | ------------------------------------------------ | -------------------- | -------- |
| query | <code>() => [Query](/packages/core#query)</code> | A query to maintain. | No       |

#### Return value

<code>[ObservableQueryState](/packages/core#observablequerystate) & {refetch: [observableQuery.refetch](/packages/core#observablequeryrefetch)}</code>

### `useMutation()`

`useMutation` is a thin wrapper for <code>[ObservableMutation](/packages/core#clientmanagemutation)</code>.

```typescript jsx
import { defineComponent, ref } from 'vue';
import { useMutation } from '@galaxis/vue';
import { userQuery } from '../requests/user';

export default defineComponent({
    setup() {
        const currentId = ref(1);

        const [deleteUser, { loading, data, reset }] = useMutation(() =>
            deleteUserMutation({ resource: { pathParams: { id: currentId.value } } }),
        );

        return { deleteUser, loading, data, currentId, reset };
    },
    methods: {
        iterateUser() {
            this.currentId = this.currentId + 1;
        },
    },
});
```

#### Arguments

| Name     | Type                                                   | Description             | Required |
| -------- | ------------------------------------------------------ | ----------------------- | -------- |
| mutation | <code>() => [Mutation](/packages/core#mutation)</code> | A mutation to maintain. | No       |

#### Return value

| Name    | Type                                                                                                                                                         | Description                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| execute | <code>(mutation?: [Mutation](/packages/core#mutation)) => Promise<[TData](/packages/core#user-defined-types)></code>                                         | A function for mutation execution. |
| state   | <code>[ObservableMutationState](/packages/core#observablemutationstate) & {reset: [observableMutation.reset](/packages/core#observablemutationreset)}</code> | Mutation state and reset function. |
