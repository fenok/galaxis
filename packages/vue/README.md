# Galaxis Vue

[![npm](https://img.shields.io/npm/v/@galaxis/react)](https://www.npmjs.com/package/@galaxis/react)

Vue bindings for [Galaxis](/README.md#galaxis-).

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

`useClientProvider()` is used to configure and provide a [Client](/packages/core#client) instance for the rest of the application.

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

`useQuery` is a wrapper around [managed query](/packages/core#clientmanagequery).

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

| Name  | Type                                       | Description         | Required |
| ----- | ------------------------------------------ | ------------------- | -------- |
| query | <code>[Query](/packages/core#query)</code> | A query to process. | No       |

#### Return value

<code>[QueryManagerResult](/packages/core#querymanagerresult)</code>

### `useMutation()`

`useMutation` is a wrapper around [managed mutation](/packages/core#clientmanagemutation).

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

| Name     | Type                                             | Description            | Required |
| -------- | ------------------------------------------------ | ---------------------- | -------- |
| mutation | <code>[Mutation](/packages/core#mutation)</code> | A mutation to process. | No       |

#### Return value

<code>[MutationManagerResult](/packages/core#mutationmanagerresult)</code>
