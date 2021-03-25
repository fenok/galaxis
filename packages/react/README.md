# Fetcher React

React bindings for Fetcher Core.

## Public API

> ⚠ Anything that is not documented here is not considered a part of public API and may change at any time.

### `ClientProvider`

`ClientProvider` is used to configure and provide a [Client](/packages/core#client) instance for the rest of the application.

```typescript jsx
interface AppProps {
    client: AppClient;
}

const App: FC<AppProps> = ({ client }) => (
    <Provider client={client}>
        <RestOfTheApp />
    </Provider>
);
```

#### Arguments

##### `ClientProviderProps`

| Name                         | Type                                                            | Description                                                                                                                                                                                             | Required |
| ---------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| client                       | <code>[Client](/packages/core#client)</code>                    | A `Client` instance that will be used by the application.                                                                                                                                               | Yes      |
| dynamicDefaultRequest        | <code>Partial<[BaseRequest](/packages/core#baserequest)></code> | Dynamic default request for the given client.                                                                                                                                                           | No       |
| dynamicDefaultQuery          | <code>Partial<[Query](/packages/core#query)></code>             | Dynamic default query for the given client.                                                                                                                                                             | No       |
| dynamicDefaultMutation       | <code>Partial<[Mutation](/packages/core#mutation)></code>       | Dynamic default mutation for the given client.                                                                                                                                                          | No       |
| preventOnHydrateCompleteCall | `boolean`                                                       | By default, `client.onHydrateComplete()` will be called in `useEffect`. It should be fine in most cases, but you can use this option as an escape hatch and call `client.onHydrateComplete()` manually. | No       |

### `useClient()`

`useClient` is used to retrieve the [Client](/packages/core#client) instance that was passed to the <code>[Provider](#clientprovider)</code>. You can then use it to perform queries and mutations manually, change configuration, access cache, etc.

```typescript jsx
const MyComponent: FC = () => {
    const client = useClient();

    const onClick = () => {
        client.fetchQuery(query).then((data) => console.log(data));
    };

    return <button onClick={onClick}>Perform query manually</button>;
};
```

### `useQuery()`

`useQuery` is a wrapper around <code>[QueryManager](/packages/core#querymanager)</code>.

```typescript jsx
const MyComponent: FC = () => {
    const { data } = useQuery(query);

    return <div>{data?.value}</div>;
};
```

#### Arguments

| Name  | Type                                       | Description         | Required |
| ----- | ------------------------------------------ | ------------------- | -------- |
| query | <code>[Query](/packages/core#query)</code> | A query to process. | No       |

#### Return value

<code>[QueryManagerResult](/packages/core#querymanagerresult)</code>

### `useMutation()`

`useMutation` is a wrapper around <code>[MutationExecutor](/packages/core#mutationmanager)</code>.

```typescript jsx
const MyComponent: FC = () => {
    const { mutate } = useMutation(mutation);

    return <button onClick={mutate}>Perform mutation</button>;
};
```

#### Arguments

| Name     | Type                                             | Description            | Required |
| -------- | ------------------------------------------------ | ---------------------- | -------- |
| mutation | <code>[Mutation](/packages/core#mutation)</code> | A mutation to process. | No       |

#### Return value

<code>[MutationManagerResult](/packages/core#mutationmanagerresult)</code>

### `getDataFromTree()`

`getDataFromTree()` is used on the server side to wait for queries to fill the cache with data and errors.

```typescript
export default async function ssrMiddleware(_: Request, res: Response<unknown>) {
    const client = getClient();

    const app = createElement(App, { client });

    await getDataFromTree(app);

    const fetcherState = client.getCache().extract();

    const html = createElement(Html, { content: renderToString(app), fetcherState });

    res.send(renderToStaticMarkup(html));
}
```

#### Arguments

| Name | Type                   | Description      | Required |
| ---- | ---------------------- | ---------------- | -------- |
| tree | <code>ReactNode</code> | The application. | Yes      |

#### Return value

`Promise<string>`. The promise resolves with the result of `renderToStaticMarkup()` call.
