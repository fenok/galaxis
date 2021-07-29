# Galaxis React

[![npm](https://img.shields.io/npm/v/@galaxis/react)](https://www.npmjs.com/package/@galaxis/react)

React bindings for [Galaxis](/README.md#galaxis-).

## Installation

```
yarn add @galaxis/react
```

This will also install and expose API of Galaxis [Core](/packages/core#galaxis-core).

The library is compiled to modern JS, but it should work in all reasonable browsers with the help of properly configured Babel.

Your client environment has to have `AbortController`. You might need to polyfill it.

You also need a version of React that supports React Hooks.

## Public API

> ⚠ Anything that is not documented here is not considered a part of public API and may change at any time.

### `ClientProvider`

`ClientProvider` is used to configure and provide a <code>[Client](/packages/core#client)</code> instance for the rest of the application.

```typescript jsx
interface AppProps {
    client: AppClient;
}

const App: FC<AppProps> = ({ client }) => (
    <ClientProvider client={client}>
        <RestOfTheApp />
    </ClientProvider>
);
```

#### Arguments

##### `ClientProviderProps`

| Name                         | Type                                         | Description                                                                                                                                                                                                                                                                                                       | Required |
| ---------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| client                       | <code>[Client](/packages/core#client)</code> | A `Client` instance that will be used by the application.                                                                                                                                                                                                                                                         | Yes      |
| preventOnHydrateCompleteCall | `boolean`                                    | By default, <code>[client.onHydrateComplete()](/packages/core#clientonhydratecomplete)</code> will be called in `useEffect`. It should be fine in most cases, but you can use this option as an escape hatch and call <code>[client.onHydrateComplete()](/packages/core#clientonhydratecomplete)</code> manually. | No       |

### `useClient()`

`useClient` is used to retrieve the <code>[Client](/packages/core#client)</code> instance that was passed to the <code>[Provider](#clientprovider)</code>. You can then use it to execute queries and mutations manually, access cache, etc.

```typescript jsx
const MyComponent: FC = () => {
    const client = useClient();

    const onClick = () => {
        client.fetchQuery(query).then((data) => console.log(data));
    };

    return <button onClick={onClick}>Fetch the query manually</button>;
};
```

### `useQuery()`

`useQuery` is a thin wrapper for <code>[ObservableQuery](/packages/core#observablequery)</code>.

On rerender, the <code>[Query](/packages/core#query)</code> objects fields are shallowly compared by the following rules:

-   The `query.resource` fields are compared by the result of the <code>[client.requestId()](../core#clientrequestid)</code> call.
-   Functions are compared by their `.toString()` representation.
-   Everything else is compared by strict equality (`===`).

```typescript jsx
const MyComponent: FC = () => {
    const { data } = useQuery(query);

    return <div>{data?.value}</div>;
};
```

#### Arguments

| Name  | Type                                       | Description          | Required |
| ----- | ------------------------------------------ | -------------------- | -------- |
| query | <code>[Query](/packages/core#query)</code> | A query to maintain. | No       |

#### Return value

<code>[ObservableQueryState](/packages/core#observablequerystate) & {refetch: [observableQuery.refetch](/packages/core#observablequeryrefetch)}</code>

### `useMutation()`

`useMutation` is a thin wrapper for <code>[ObservableMutation](/packages/core#clientmanagemutation)</code>.

On rerender, the <code>[Mutation](/packages/core#mutation)</code> object is just reassigned, because it doesn't lead to any side effects.

```typescript jsx
const MyComponent: FC = () => {
    const [execute, state] = useMutation(mutation);

    return <button onClick={execute}>Execute the mutation</button>;
};
```

#### Arguments

| Name     | Type                                             | Description             | Required |
| -------- | ------------------------------------------------ | ----------------------- | -------- |
| mutation | <code>[Mutation](/packages/core#mutation)</code> | A mutation to maintain. | No       |

#### Return value

| Name    | Type                                                                                                                                                         | Description                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| execute | <code>(mutation?: [Mutation](/packages/core#mutation)) => Promise<[TData](/packages/core#user-defined-types)></code>                                         | A function for mutation execution. |
| state   | <code>[ObservableMutationState](/packages/core#observablemutationstate) & {reset: [observableMutation.reset](/packages/core#observablemutationreset)}</code> | Mutation state and reset function. |

### `getDataFromTree()`

`getDataFromTree()` is used on the server side to wait for queries to fill the cache with data and errors.

```typescript
export default async function ssrMiddleware(_: Request, res: Response<unknown>) {
    const client = getClient();

    const app = createElement(App, { client });

    await getDataFromTree(app);

    const galaxisState = client.getCache().extract();

    const html = createElement(Html, { content: renderToString(app), galaxisState });

    res.send(renderToStaticMarkup(html));
}
```

#### Arguments

| Name | Type                   | Description      | Required |
| ---- | ---------------------- | ---------------- | -------- |
| tree | <code>ReactNode</code> | The application. | Yes      |

#### Return value

`Promise<string>`. The promise resolves with the result of `renderToStaticMarkup()` call.
