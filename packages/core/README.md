# Fetcher Core

[![npm](https://img.shields.io/npm/v/react-fetching-hooks)](https://www.npmjs.com/package/react-fetching-hooks)

Fetcher core is dependency-free, framework-agnostic and as unopinionated as possible.

## Public API

> ⚠ Anything that is not documented here is not considered a part of public API and may change at any time.

### Client

`Client` is responsible for executing queries and mutations imperatively. Note that normally you should execute queries in a declarative way with the help of <code>[QueryManager](#querymanager)</code>.

```typescript
const client = new Client({
    cache: new MyCache(),
});
```

##### Arguments

###### `ClientOptions`

| Name            | Type                                                                             | Description                                                                                                                                                                                    | Required |
| --------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| cache           | <code>[CACHE](#user-defined-types)</code>                                        | Cache for storing normalized data and errors.                                                                                                                                                  | Yes      |
| merge           | <code>(r1: R1, r2: R2, r3: R3, r4: R4, r5: R5) => R1 & R2 & R3 & R4 & R5;</code> | A function for merging queries and mutations with static and dynamic defaults.                                                                                                                 | Yes      |
| hash            | <code>(value: unknown) => string</code>                                          | A function for hashing <code>[BaseRequest](#baserequest)</code>, <code>[BaseQuery](#basequery)</code> or <code>[BaseMutation](#basemutation)</code> objects, and their `requestParams` fields. | Yes      |
| defaultRequest  | <code>Partial<[BaseRequest](#baserequest)></code>                                | Static default request. Can't be changed later.                                                                                                                                                | No       |
| defaultQuery    | <code>Partial<[BaseQuery](#baserequest)></code>                                  | Static default query. Can't be changed later.                                                                                                                                                  | No       |
| defaultMutation | <code>Partial<[BaseMutation](#baserequest)></code>                               | Static default mutation. Can't be changed later.                                                                                                                                               | No       |

##### Return value

[Client](#client)

#### `client.query()`

Execute the query. This method will always trigger a network request.

```typescript
const result = client.query(query);
```

##### Arguments

| Name  | Type                                 | Description       | Required |
| ----- | ------------------------------------ | ----------------- | -------- |
| query | <code>[BaseQuery](#basequery)</code> | Query to execute. | Yes      |

##### Return value

<code>Promise<[D](#user-defined-types)></code>

#### `client.watchQuery()`

Execute the query and subscribe to the changes in its state.

```typescript
const result = client.watchQuery(query, onChange);
```

##### Arguments

| Name     | Type                                                    | Description                                             | Required |
| -------- | ------------------------------------------------------- | ------------------------------------------------------- | -------- |
| query    | <code>[BaseQuery](#basequery)</code>                    | A query to execute.                                     | Yes      |
| onChange | <code>(state: [QueryState](#querystate)) => void</code> | A callback to call when the state of the query changes. | No       |

##### Return value

###### `WatchQueryResult`

Extends [QueryState](#querystate).

| Name        | Type                                                            | Description                                                                                                                                                                                                    |
| ----------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| request     | <code>Promise<[D](#user-defined-types)> &#124; undefined</code> | A promise representing network request. It will be `undefined`, if it wasn't required (or was required, but wasn't allowed on the server side). Internally, there may be more than one actual network request. |
| unsubscribe | <code>() => void &#124; undefined</code>                        | A function for unsubscribing. Will be `undefined` if there was no subscription. It can happen when `onChange` argument wasn't passed, or if the query itself is not cacheable.                                 |

#### `client.getQueryState()`

Get state of the given query.

```typescript
const queryState = client.getQueryState(query);
```

##### Arguments

| Name  | Type                                 | Description | Required |
| ----- | ------------------------------------ | ----------- | -------- |
| query | <code>[BaseQuery](#basequery)</code> | Query.      | Yes      |

##### Return value

###### `QueryState`

| Name            | Type                                                    | Description                                                                                                                                                                                                                                      |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| cache           | <code>[QueryCache](#querycache) &#124; undefined</code> | Query state from the cache. Will be `undefined` if the given query is not cacheable (has `fetchPolicy: 'no-cache'`).                                                                                                                             |
| requestRequired | <code>boolean</code>                                    | Specifies whether a network request is required, based on cache state and fetch policy of the given query. The actual network request may still not be allowed on the server side. If `true`, the query should be rendered with `loading: true`. |

##### Related types

###### `QueryCache`

| Name  | Type                                                                | Description                                                                                                                                                                     |
| ----- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| data  | <code>[D](#user-defined-types) &#124; undefined</code>              | Data from the cache. `undefined` means no data. An unsuccessful request **will not** overwrite this field. It can be thought of as _the last known data_.                       |
| error | <code>Error &#124; [E](#user-defined-types) &#124; undefined</code> | Error from the cache. `undefined` means no error. A successful request **will** overwrite this field to `undefined`. It can be thought of as _the error from the last request_. |

#### `client.mutate()`

Execute mutation.

```typescript
const mutationResult = client.mutate(mutation);
```

##### Arguments

| Name     | Type                                       | Description          | Required |
| -------- | ------------------------------------------ | -------------------- | -------- |
| mutation | <code>[BaseMutation](#basemutation)</code> | Mutation to execute. | Yes      |

##### Return value

<code>Promise<[D](#user-defined-types)></code>

#### `client.purge()`

Reset the client. Specifically, abort all requests, clear the cache and clear dynamic defaults. You should call this method on logout.

```typescript
client.purge();
```

#### `client.getCache()`

Get cache that was passed to the constructor.

```typescript
const cache = client.getCache();
```

##### Return value

[CACHE](#user-defined-types)

#### `client.onHydrateComplete()`

Report to the client that the hydrate stage is complete. The client always starts in the hydrate stage, and it's a one-way operation.

```typescript
client.onHydrateComplete();
```

#### `client.setDynamicDefaultRequest()`

Set dynamic default request.

```typescript
client.setDynamicDefaultRequest(defaultRequest);
```

##### Arguments

| Name           | Type                                              | Description      | Required |
| -------------- | ------------------------------------------------- | ---------------- | -------- |
| defaultRequest | <code>Partial<[BaseRequest](#baserequest)></code> | Default request. | Yes      |

#### `client.setDynamicDefaultQuery()`

Set dynamic default query.

```typescript
client.setDynamicDefaultQuery(defaultQuery);
```

##### Arguments

| Name         | Type                                          | Description    | Required |
| ------------ | --------------------------------------------- | -------------- | -------- |
| defaultQuery | <code>Partial<[BaseQuery](#basequery)></code> | Default query. | Yes      |

#### `client.setDynamicDefaultMutation()`

Set dynamic default mutation.

```typescript
client.setDynamicDefault<Mutation>(defaultMutation);
```

##### Arguments

| Name            | Type                                                | Description       | Required |
| --------------- | --------------------------------------------------- | ----------------- | -------- |
| defaultMutation | <code>Partial<[BaseMutation](#basemutation)></code> | Default mutation. | Yes      |

### QueryManager

Query manager helps with executing queries in a declarative way. It should be instantiated on the application component mount and destroyed on the component unmount. Each query usage inside the component requires its own instance of `QueryManager`.

```typescript
const queryManager = new QueryManager({ forceUpdate });
```

##### Arguments

###### `QueryManagerOptions`

| Name        | Type                    | Description                                                                                                                                                                       | Required |
| ----------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| forceUpdate | <code>() => void</code> | The function that will be called on internal state change. When it's called, you should call <code>[queryManager.process()](#querymanagerprocess)</code> again to get new values. | Yes      |

#### `queryManager.process()`

Call it on each component update. If arguments didn't change, a new object with the same values will be returned. If arguments did change, the previous query will be soft-aborted, and a new query will be executed.

If `ssrPromisesManager` was provided, and there was a network request, it will be added to the manager.

Note that `client` and `ssrPromisesManager` arguments are compared by reference, and `query` argument is compared by hash, calculated by the function that was passed to the <code>[Client](#client)</code>.

```typescript
const result = queryManager.process(query, client, ssrPromisesManager);
```

##### Arguments

| Name               | Type                                                   | Description                  | Required |
| ------------------ | ------------------------------------------------------ | ---------------------------- | -------- |
| query              | <code>[Query](#query)</code>                           | Query to process.            | Yes      |
| client             | <code>[Client](#client)</code>                         | Client to use.               | Yes      |
| ssrPromisesManager | <code>[SsrPromisesManager](#ssrpromisesmanager)</code> | Ssr promises manager to use. | No       |

##### Return value

###### `QueryManagerResult`

| Name    | Type                                                                | Description                                                                              |
| ------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| loading | <code>boolean</code>                                                | If `true`, there is a network request in progress, **initiated by the manager**.         |
| data    | <code>[D](#user-defined-types) &#124; undefined</code>              | Last known data for the given query.                                                     |
| error   | <code>[E](#user-defined-types) &#124; Error &#124; undefined</code> | Error from the last network request for the given query.                                 |
| refetch | <code>() => Promise<[D](#user-defined-types)></code>                | Call to force network request, even for a query with `fetchPolicy: 'cache-only'`.        |
| abort   | <code>() => void</code>                                             | Abort current network request. It is **not** a soft abort (see [BaseQuery](#basequery)). |

#### `queryManager.cleanup()`

Call it on component unmount to perform the internal cleanup.

```typescript
queryManager.cleanup();
```

### MutationManager

Mutation manager helps with dealing with mutations in a declarative way. It should be instantiated on the application component mount and destroyed on the component unmount. Each mutation usage inside the component requires its own instance of `MutationManager`.

```typescript
const mutationManager = new MutationManager({ forceUpdate });
```

##### Arguments

###### `MutationManagerOptions`

| Name        | Type                    | Description                                                                                                                                                                             | Required |
| ----------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| forceUpdate | <code>() => void</code> | The function that will be called on internal state change. When it's called, you should call <code>[mutationManager.process()](#mutationmanagerprocess)</code> again to get new values. | Yes      |

#### `mutationManager.process()`

Call it on each component update. If arguments didn't change, a new object with the same values will be returned. If arguments did change, the manager will switch to the new mutation.

The manager will not execute the mutation on `process` call. It also will **not** cancel the previous mutation after switching to the new one.

Note that `client` argument is compared by reference, and `mutation` argument is compared by hash, calculated by the function that was passed to the <code>[Client](#client)</code>.

```typescript
const result = mutationManager.process(mutation, client);
```

##### Arguments

| Name     | Type                               | Description          | Required |
| -------- | ---------------------------------- | -------------------- | -------- |
| mutation | <code>[Mutation](#mutation)</code> | Mutation to process. | Yes      |
| client   | <code>[Client](#client)</code>     | Client to use.       | Yes      |

##### Return value

###### `MutationManagerResult`

| Name    | Type                                                                | Description                                                               |
| ------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| mutate  | <code>() => Promise<[D](#user-defined-types)></code>                | Execute the mutation.                                                     |
| loading | <code>boolean</code>                                                | If `true`, there is a network request in progress for the given mutation. |
| data    | <code>[D](#user-defined-types) &#124; undefined</code>              | Last known data for the given mutation.                                   |
| error   | <code>[E](#user-defined-types) &#124; Error &#124; undefined</code> | Error from the last network request for the given mutation.               |
| abort   | <code>() => void</code>                                             | Abort current network request.                                            |

### SsrPromisesManager

SsrPromisesManager is a small helper for dealing with promises on the server side.

The exact algorithm is up to you, but this seems to be the most robust way:

1. Render the app, adding promises from [QueryResult](#queryresult) as they appear.
2. Check for added promises. If there are any, wait for them, then go to 1. Otherwise, go to 3.
3. The cache is now filled with data and errors.

```typescript
const ssrPromisesManager = new SsrPromisesManager();
```

#### `ssrPromisesManager.addPromise()`

Add a promise to the manager.

```typescript
ssrPromisesManager.addPromise(promise);
```

##### Arguments

| Name    | Type           | Description       | Required |
| ------- | -------------- | ----------------- | -------- |
| promise | `Promise<any>` | A promise to add. | Yes      |

#### `ssrPromisesManager.awaitPromises()`

Returns promise that resolves when all added promises are resolved or rejected.

```typescript
await ssrPromisesManager.awaitPromises();
```

##### Return value

`Promise<void>`

#### `ssrPromisesManager.hasPromises()`

Checks if there are added promises.

```typescript
const hasPromises = ssrPromisesManager.hasPromises();
```

##### Return value

`boolean`

### Important Types

#### User-defined types

| Name    | Scope            | Constraint                                             | Description                                                                       |
| ------- | ---------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `CACHE` | Client-specific  | Must extend <code>[Cache](#cache)</code>               | Cache for storing normalized data and errors.                                     |
| `C`     | Client-specific  | Must extend <code>[NonUndefined](#nonundefined)</code> | Cache data. Normalized data from all requests.                                    |
| `BD`    | Client-specific  | Must extend <code>[NonUndefined](#nonundefined)</code> | Query or mutation data, common for all requests. Used for defaults.               |
| `BE`    | Client-specific  | Must extend `Error`                                    | Query or mutation error, common for all requests. Used for defaults.              |
| `BR`    | Client-specific  | None                                                   | Query or mutation request parameters, common for all requests. Used for defaults. |
| `D`     | Request-specific | Must extend <code>BD</code>                            | Query or mutation data.                                                           |
| `E`     | Request-specific | Must extend `BE`                                       | Query or mutation error.                                                          |
| `R`     | Request-specific | Must extend `BR`                                       | Query or mutation request parameters.                                             |

##### `NonUndefined`

Anything but `undefined`.

#### `BaseRequest`

This type describes base network request.

| Name              | Type                                                                                                                        | Description                                                                                                                                                                                                                                                                                                                                                                                                | Required                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| requestParams     | <code>[R](#user-defined-types)</code>                                                                                       | Arbitrary storage of request parameters.                                                                                                                                                                                                                                                                                                                                                                   | Yes                                                     |
| abortSignal       | `AbortSignal`                                                                                                               | Signal for aborting the request.                                                                                                                                                                                                                                                                                                                                                                           | No                                                      |
| getRequestFactory | <code>(opts: [RequestOptions](#requestoptions)) => (abortSignal?: AbortSignal) => Promise<[D](#user-defined-types)>;</code> | A function that returns the factory for creating network requests.<br/>Note that `abortSignal` for the factory is created by the library. It is **not** the same signal as `abortSignal` field of `BaseRequest`.<br/> Also, note that the factory return value is actually typed as <code>Promise<D &#124; E></code>. It is done only to support error typing. You must always reject in case of an error. | No, a rejected promise will be used by default          |
| getRequestId      | <code>(opts: [RequestOptions](#requestoptions)) => string;</code>                                                           | Function for calculating request id. It should take some hash from `requestParams`, excluding parts that are different between client and server.                                                                                                                                                                                                                                                          | No, a hash from `requestParams` will be used by default |
| toCache           | <code>(opts: [CacheAndDataOptions](#cacheanddataoptions)) => [C](#user-defined-types);</code>                               | A function that modifies cache data based on request data (from network or optimistic response).                                                                                                                                                                                                                                                                                                           | No                                                      |

#### `BaseQuery`

Extends [BaseRequest](#baserequest). Base queries can be executed by [Client](#client).

| Name                | Type                                                                                             | Description                                                                                                                                                                                                                      | Required                               |
| ------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| fetchPolicy         | <code>[FetchPolicy](#fetchpolicy)</code>                                                         | [Fetch policy](../../README.md#fetch-policies).                                                                                                                                                                                  | No, `'cache-only'` is used by default. |
| lazy                | `boolean`                                                                                        | If `true`, the query will not be fetched automatically regardless of `fetchPolicy`. Such a query can only be executed manually. It's also useful if the query is depending on data from another query, which hasn't arrived yet. | No                                     |
| disableSsr          | `boolean`                                                                                        | If `true`, the query will not be fetched on the server.                                                                                                                                                                          | No                                     |
| optimizeOnHydrate   | `boolean`                                                                                        | If `true`, the query won't be fetched on the client during the hydrate stage, if there is data **or error** in the cache. `fetchPolicy` option is ignored.                                                                       | No                                     |
| forceRequestOnMerge | `boolean`                                                                                        | If `true`, the query will start a new network request, if it's merged with the existing query.                                                                                                                                   | No                                     |
| softAbortSignal     | `AbortSignal`                                                                                    | Soft aborting should be used to indicate loss of interest in the ongoing network request. The actual request won't be aborted if there are other interested parties.                                                             | No                                     |
| fromCache           | <code>(opts: [CacheOptions](#cacheoptions)) => [D](#user-defined-types) &#124; undefined </code> | Function for retrieving query data from cache data.                                                                                                                                                                              | No                                     |

#### `BaseMutation`

Extends [BaseRequest](#baserequest). Base mutations can be executed by [Client](#client).

| Name                 | Type                                                                                         | Description                                             | Required |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| optimisticData       | <code>[D](#user-defined-types)</code>                                                        | Optimistic data (optimistic response).                  | No       |
| removeOptimisticData | <code>(opts: [CacheAndDataOptions](#cacheanddataoptions)) => [C](#user-defined-types)</code> | A function that removes optimistic data from the cache. | No       |

#### `Query`

Extends [BaseQuery](#basequery). Queries can be processed by [QueryManager](#querymanager).

#### `Mutation`

Extends [BaseMutation](#basemutation). Mutations can be processed by [MutationManager](#mutationmanager).

##### `RequestOptions`

| Name          | Type                                  | Description                              |
| ------------- | ------------------------------------- | ---------------------------------------- |
| requestParams | <code>[R](#user-defined-types)</code> | Arbitrary storage of request parameters. |

##### `CacheOptions`

| Name          | Type                                  | Description                              |
| ------------- | ------------------------------------- | ---------------------------------------- |
| cacheData     | <code>[C](#user-defined-types)</code> | Cache data.                              |
| requestParams | <code>[R](#user-defined-types)</code> | Arbitrary storage of request parameters. |
| requestId     | `string`                              | Request id.                              |

##### `CacheAndDataOptions`

Extends <code>[CacheOptions](#cacheoptions)</code>

| Name | Type                                  | Description                                                      |
| ---- | ------------------------------------- | ---------------------------------------------------------------- |
| data | <code>[D](#user-defined-types)</code> | Data of the given request (from network or optimistic response). |

##### `FetchPolicy`

<code>'cache-only' &#124; 'cache-first' &#124; 'cache-and-network' &#124; 'no-cache'</code>

#### `Cache`

| Name      | Type                                                         | Description                                                                                                    |
| --------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| subscribe | <code>(callback: () => void) => () => void</code>            | Subscribe to the cache. The `callback` will be called on cache changes. Call returned function to unsubscribe. |
| update    | <code>(opts: [UpdateOptions](#updateoptions)) => void</code> | Update cache state.                                                                                            |
| getData   | <code>() => [C](#user-defined-types)</code>                  | Get cache data.                                                                                                |
| getError  | <code>(requestId: string) => Error &#124; undefined</code>   | Get cached error for the given request id.                                                                     |
| purge     | <code>() => void</code>                                      | Reset the cache to empty state.                                                                                |

##### `UpdateOptions`

| Name  | Type                                          | Description                                                                                                                                                                                            | Required |
| ----- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| data  | <code>[C](#user-defined-types)</code>         | New cache data. Omit or set to `undefined` if no update is needed.                                                                                                                                     | No       |
| error | <code>[string, Error &#124; undefined]</code> | New error. The first element of the tuple is the request id. The second one is the error value, where `undefined` means "clear error". Omit the tuple or set it to `undefined` if no update is needed. | No       |
