# Fetcher Core

[![npm](https://img.shields.io/npm/v/react-fetching-hooks)](https://www.npmjs.com/package/react-fetching-hooks)

Fetcher core is dependency-free, framework-agnostic and as unopinionated as possible.

## Features

### Queries

Queries are requests that **do not** change the system state. They are described as <code>[BaseQuery](#basequery)</code> objects.

### Mutations

Mutations are requests that **do** change the system state. They are described as <code>[BaseMutation](#basemutation)</code> objects.

### Fetch Policies

You must specify query `fetchPolicy` to indicate how this query should be updated.

| `fetchPolicy`         | Query execution result                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'cache-only'`        | No network request. Returns state from the cache.                                                                                                                    |
| `'cache-first'`       | Network request, if there is no data in the cache. Returns state from the cache. The cache is then updated with the request result (if there was a network request). |
| `'cache-and-network'` | Network request regardless of cache state. Returns state from the cache. The cache is then updated with the request result.                                          |
| `'no-cache'`          | Network request regardless of cache state. Does not touch the cache in any way.                                                                                      |

### Query Merging

The library encourages executing queries at arbitrary parts of code and points in time. This way, any component of the application can express its data requirements in isolation from other components.

That would lead to duplicate requests to the same resources. To prevent that, the library uses **query merging**.

Query merging works as follows. The query will reuse ongoing network request with the same id. The cache will also be updated just once, using the first _cacheable_ query that created or reused the request. A query is cacheable if its `fetchPolicy` is not `no-cache`.

This means that queries with the same request id must update the cache in the same way. It shouldn't be an issue, as the opposite makes no sense.

### Request Queueing

Since queries (and mutations!) are executed at arbitrary points in time, there must be a way to prevent overwriting newer data by the older one. This is done by **request queueing**.

Request queueing ensures that all queries, which were started before some mutation, are finished before that mutation is started (in no particular order). It also ensures that the next mutation will be started only after the previous one was finished.

A typical queue may look like this:

```
[a bunch of queries] -> [mutation] -> [mutation] -> [a bunch of queries]
```

It's worth noting that queued requests can be aborted at any time, regardless of position in the queue.

### Server-side rendering

The library is built with SSR in mind. There is no SSR-specific code in components, so they are SSR-ready by default.

The server waits until all queries are executed and the cache is filled with data and errors, then renders the app based on the cache, and sends resulting HTML with embedded cache to the client.

### Hydrate Stage Optimization

If you're doing SSR, you're going to have a hydrate stage on the client, which is the initial render with cached data. By default, queries with `fetchPolicy: 'cache-and-network'` will be fetched during the hydrate stage. This is likely undesirable because these requests were just performed on the server.

It can be fixed by setting `preventExcessRequestOnHydrate: true` for all queries by default. In general, you should always do that, unless your cache is not coming from just-performed requests (e.g. you are not doing SSR, but persist the cache to local storage).

### Optimistic Responses

You can specify `optimisticData` for mutations. During mutation execution, the cache will immediately be updated with this data, and then with the real data when it arrives. Note that you also have to specify the `removeOptimisticData()` and `toCache()` functions, so the library knows how to remove the optimistic data from the cache, and how to put the real data in.

### Great customization capabilities

The library is completely unopinionated about the network level. You can use fetch, axios, XMLHttpRequest, or any other solution. You can add network requests logging, retries, or timeouts. See [BaseRequest](#baserequest) for details.

The library is also unopinionated about [Cache](#cache) internals. You can add cache persistence, partial or complete. You even should be able to integrate the cache with your own state management solution, should you need so.

## Public API

> ⚠ Anything that is not documented here is not considered a part of public API and may change at any time.

### Client

`Client` is responsible for executing queries and mutations imperatively. Note that normally you should execute queries in a declarative way with the help of <code>[QueryManager](#querymanager)</code>.

```typescript
const client = new Client({
    cache: new MyCache(),
    merge,
    hash,
    defaultRequest,
    defaultQuery,
    defaultMutation,
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

Execute the query and optionally subscribe to the changes in its state.

```typescript
const result = client.query(query, onChange);
```

##### Arguments

| Name     | Type                                                    | Description                                             | Required |
| -------- | ------------------------------------------------------- | ------------------------------------------------------- | -------- |
| query    | <code>[BaseQuery](#basequery)</code>                    | A query to execute.                                     | Yes      |
| onChange | <code>(state: [QueryState](#querystate)) => void</code> | A callback to call when the state of the query changes. | No       |

##### Return value

###### `QueryResult`

Extends [QueryState](#querystate).

| Name    | Type                                                            | Description                                                                                                                                                                                                    |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| request | <code>Promise<[D](#user-defined-types)> &#124; undefined</code> | A promise representing network request. It will be `undefined`, if it wasn't required (or was required, but wasn't allowed on the server side). Internally, there may be more than one actual network request. |

#### `client.fetchQuery()`

Force-fetch the query. This method will always trigger a network request.

```typescript
const result = client.fetchQuery(query);
```

##### Arguments

| Name  | Type                                 | Description       | Required |
| ----- | ------------------------------------ | ----------------- | -------- |
| query | <code>[BaseQuery](#basequery)</code> | Query to execute. | Yes      |

##### Return value

<code>Promise<[D](#user-defined-types)></code>

#### `client.readQuery()`

Get state of the given query.

```typescript
const queryState = client.readQuery(query, onChange);
```

##### Arguments

| Name     | Type                                                    | Description                                             | Required |
| -------- | ------------------------------------------------------- | ------------------------------------------------------- | -------- |
| query    | <code>[BaseQuery](#basequery)</code>                    | Query.                                                  | Yes      |
| onChange | <code>(state: [QueryState](#querystate)) => void</code> | A callback to call when the state of the query changes. | No       |

##### Return value

###### `QueryState`

| Name            | Type                                                                | Description                                                                                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| data            | <code>[D](#user-defined-types) &#124; undefined</code>              | Data from the cache. `undefined` means no data. An unsuccessful request **will not** overwrite this field. It can be thought of as _the last known data_. Always `undefined` for non-cacheable query.                                            |
| error           | <code>Error &#124; [E](#user-defined-types) &#124; undefined</code> | Error from the cache. `undefined` means no error. A successful request **will** overwrite this field to `undefined`. It can be thought of as _the error from the last request_. Always `undefined` for non-cacheable query.                      |
| requestRequired | <code>boolean</code>                                                | Specifies whether a network request is required, based on cache state and fetch policy of the given query. The actual network request may still not be allowed on the server side. If `true`, the query should be rendered with `loading: true`. |
| requestAllowed  | <code>boolean</code>                                                | Specifies whether a network request is allowed. Always `true` on the client side.                                                                                                                                                                |
| cacheable       | <code>boolean</code>                                                | A query is not cacheable, if it has `fetchPolicy: 'no-cache'`.                                                                                                                                                                                   |
| unsubscribe     | <code>() => void &#124; undefined</code>                            | A function for unsubscribing. Will be `undefined` if there was no subscription. It can happen when `onChange` argument wasn't passed, or if the query itself is not cacheable.                                                                   |

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

| Name               | Type                                                   | Description                                                                                                                                | Required |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| query              | <code>[Query](#query) &#124; undefined</code>          | Query to process. Pass `undefined` to indicate that this query will appear later, e.g. because it depends on data that hasn't arrived yet. | Yes      |
| client             | <code>[Client](#client)</code>                         | Client to use.                                                                                                                             | Yes      |
| ssrPromisesManager | <code>[SsrPromisesManager](#ssrpromisesmanager)</code> | Ssr promises manager to use.                                                                                                               | No       |

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

| Name     | Type                                                | Description                                                                                                                                      | Required |
| -------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| mutation | <code>[Mutation](#mutation) &#124; undefined</code> | Mutation to process. Pass `undefined` to indicate that this mutation will appear later, e.g. because it depends on data that hasn't arrived yet. | Yes      |
| client   | <code>[Client](#client)</code>                      | Client to use.                                                                                                                                   | Yes      |

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

| Name                | Type                                                                                             | Description                                                                                                                                                          | Required                               |
| ------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| fetchPolicy         | <code>[FetchPolicy](#fetchpolicy)</code>                                                         | [Fetch policy](#fetch-policies).                                                                                                                                     | No, `'cache-only'` is used by default. |
| disableSsr          | `boolean`                                                                                        | If `true`, the query will not be fetched on the server.                                                                                                              | No                                     |
| optimizeOnHydrate   | `boolean`                                                                                        | If `true`, the query won't be fetched on the client during the hydrate stage, if there is data **or error** in the cache. `fetchPolicy` option is ignored.           | No                                     |
| forceRequestOnMerge | `boolean`                                                                                        | If `true`, the query will start a new network request, if it's merged with the existing query.                                                                       | No                                     |
| softAbortSignal     | `AbortSignal`                                                                                    | Soft aborting should be used to indicate loss of interest in the ongoing network request. The actual request won't be aborted if there are other interested parties. | No                                     |
| fromCache           | <code>(opts: [CacheOptions](#cacheoptions)) => [D](#user-defined-types) &#124; undefined </code> | Function for retrieving query data from cache data.                                                                                                                  | No                                     |

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
