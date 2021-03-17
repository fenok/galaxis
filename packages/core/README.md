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

### Query merging

The library encourages executing queries at arbitrary points in time. This way, any component of the application can express its data requirements in isolation from other components.

That would lead to duplicate requests to the same resources. To prevent that, the library uses **query merging**.

Query merging works as follows. The query will reuse ongoing network request with the same id. The cache will also be updated just once, using the first _cacheable_ query that created or reused the request. A query is cacheable if its `fetchPolicy` is not `no-cache`.

This means that queries with the same request id must update the cache in the same way. It shouldn't be an issue, as the opposite makes no sense.

### Race conditions handling

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

### Hydrate stage optimization

If you're doing SSR, you're going to have a hydrate stage on the client, which is the initial render with cached data. By default, queries with `fetchPolicy: 'cache-and-network'` will be fetched during the hydrate stage. This is likely undesirable because these requests were just performed on the server.

It can be fixed by setting `preventExcessRequestOnHydrate: true` for all queries by default. In general, you should always do that, unless your cache is not coming from just-performed requests (e.g. you are not doing SSR, but persist the cache to local storage).

### Optimistic responses

You can specify `optimisticData` for mutations. During mutation execution, the cache will immediately be updated with this data, and then with the real data when it arrives. Note that you also have to specify the `removeOptimisticData()` and `toCache()` functions, so the library knows how to remove the optimistic data from the cache, and how to put the real data in.

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

| Name  | Type                                      | Description                                   | Required |
| ----- | ----------------------------------------- | --------------------------------------------- | -------- |
| cache | <code>[CACHE](#user-defined-types)</code> | Cache for storing normalized data and errors. | Yes      |

##### Return value

[Client](#client)

#### `client.query()`

Execute query.

```typescript
const queryResult = client.query(query, requestFlags);
```

##### Arguments

| Name         | Type                                                          | Description                                                                                                                                                                                                                                   | Required |
| ------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| query        | <code>[BaseQuery](#basequery)</code>                          | Query to execute.                                                                                                                                                                                                                             | Yes      |
| requestFlags | <code>Partial<[QueryRequestFlags](#queryrequestflags)></code> | Flags that will override internal values for this call. This way you can force-enable the network request. If you want to force-disable the network request, you should just use <code>[client.getQueryState()](#clientgetquerystate)</code>. | No       |

##### Return value

###### `QueryResult`

| Name         | Type                                                            | Description                                                                                                                                                                                                                                                         |
| ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cache        | <code>[QueryCache](#querycache) &#124; undefined</code>         | Query state from the cache **before network request**. Will be `undefined` if the given query is not cacheable (has `fetchPolicy: 'no-cache'`).                                                                                                                     |
| requestFlags | <code>[QueryRequestFlags](#queryrequestflags)</code>            | Internal flags for the given query **before network request**. Not affected by `requestFlags` argument.                                                                                                                                                             |
| request      | <code>Promise<[D](#user-defined-types)> &#124; undefined</code> | Promise representing network request. It will be `undefined`, if it wasn't required (or was required, but wasn't allowed) by internal flags, and they weren't overridden by `requestFlags` argument. Internally, there may be more than one actual network request. |

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

#### `client.getQueryState()`

Get state of given query.

```typescript
const queryState = client.getQueryState(query);
```

##### Arguments

| Name  | Type                                 | Description | Required |
| ----- | ------------------------------------ | ----------- | -------- |
| query | <code>[BaseQuery](#basequery)</code> | Query.      | Yes      |

##### Return value

###### `QueryState`

| Name         | Type                                                    | Description                                                                                                          |
| ------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| cache        | <code>[QueryCache](#querycache) &#124; undefined</code> | Query state from the cache. Will be `undefined` if the given query is not cacheable (has `fetchPolicy: 'no-cache'`). |
| requestFlags | <code>[QueryRequestFlags](#queryrequestflags)</code>    | Internal flags for the given query.                                                                                  |

#### `client.subscribe()`

Subscribe to state changes of the given query.

```typescript
const subscription = client.subscribe(query, onChange);
```

##### Arguments

| Name     | Type                                                    | Description                  | Required |
| -------- | ------------------------------------------------------- | ---------------------------- | -------- |
| query    | <code>[BaseQuery](#basequery)</code>                    | Query.                       | Yes      |
| onChange | <code>(state: [QueryState](#querystate)) => void</code> | Callback to call on changes. | Yes      |

##### Return value

| Name        | Type                                   | Description                        |
| ----------- | -------------------------------------- | ---------------------------------- |
| queryState  | <code>[QueryState](#querystate)</code> | Current query state.               |
| unsubscribe | <code>() => void</code>                | Call this function to unsubscribe. |

#### `client.onHydrateComplete()`

Report to the client that the hydrate stage is complete. The client always starts in the hydrate stage, and it's a one-way operation.

```typescript
client.onHydrateComplete();
```

#### `client.purge()`

Reset the client. Specifically, abort all requests and clear the cache. You should call this method on logout.

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

### QueryManager

Query manager helps with executing queries in a declarative way. It should be instantiated on the application component mount and destroyed on the component unmount. Each query usage inside the component requires its own instance of `QueryManager`.

```typescript
const queryManager = new QueryManager({ forceUpdate });
```

##### Arguments

| Name        | Type                    | Description                                                                                                                                                                       | Required |
| ----------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| forceUpdate | <code>() => void</code> | The function that will be called on internal state change. When it's called, you should call <code>[queryManager.process()](#querymanagerprocess)</code> again to get new values. | Yes      |

#### `queryManager.process()`

Call it on each component update. If arguments didn't change, a new object with the same values will be returned. If arguments did change, the previous query will be soft-aborted, and a new query will be executed.

If `ssrPromisesManager` was provided, and there was a network request, it will be added to the manager.

Note that the arguments are compared by reference.

```typescript
const result = queryManager.process(query, client, ssrPromisesManager);
```

##### Arguments

| Name               | Type                                                   | Description                  | Required |
| ------------------ | ------------------------------------------------------ | ---------------------------- | -------- |
| query              | <code>[BaseQuery](#basequery)</code>                   | Query to process.            | Yes      |
| client             | <code>[Client](#client)</code>                         | Client to use.               | Yes      |
| ssrPromisesManager | <code>[SsrPromisesManager](#ssrpromisesmanager)</code> | Ssr promises manager to use. | No       |

##### Return value

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

| Name    | Scope            | Constraint                               | Description                                    |
| ------- | ---------------- | ---------------------------------------- | ---------------------------------------------- |
| `CACHE` | Client-specific  | Must extend <code>[Cache](#cache)</code> | Cache for storing normalized data and errors.  |
| `C`     | Client-specific  | Anything but `undefined`                 | Cache data. Normalized data from all requests. |
| `D`     | Request-specific | Anything but `undefined`                 | Query or mutation data.                        |
| `E`     | Request-specific | Must extend `Error`                      | Query or mutation error.                       |
| `R`     | Request-specific | None                                     | Query or mutation request parameters.          |

#### BaseRequest

This type describes base network request.

| Name              | Type                                                                                                                        | Description                                                                                                                                                                                                                                                                                                                                                                                                | Required |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| requestParams     | <code>[R](#user-defined-types)</code>                                                                                       | Arbitrary storage of request parameters.                                                                                                                                                                                                                                                                                                                                                                   | Yes      |
| abortSignal       | `AbortSignal`                                                                                                               | Signal for aborting the request.                                                                                                                                                                                                                                                                                                                                                                           | No       |
| getRequestFactory | <code>(opts: [RequestOptions](#requestoptions)) => (abortSignal?: AbortSignal) => Promise<[D](#user-defined-types)>;</code> | A function that returns the factory for creating network requests.<br/>Note that `abortSignal` for the factory is created by the library. It is **not** the same signal as `abortSignal` field of `BaseRequest`.<br/> Also, note that the factory return value is actually typed as <code>Promise<D &#124; E></code>. It is done only to support error typing. You must always reject in case of an error. | Yes      |
| getRequestId      | <code>(opts: [RequestOptions](#requestoptions)) => string;</code>                                                           | Function for calculating request id. It should take some hash from `requestParams`, excluding parts that are different between client and server.                                                                                                                                                                                                                                                          | Yes      |
| toCache           | <code>(opts: [CacheOptionsWithData](#cacheoptionswithdata)) => [C](#user-defined-types);</code>                             | A function that modifies cache data based on request data (from network or optimistic response).                                                                                                                                                                                                                                                                                                           | No       |

#### BaseQuery

This type describes base query. It extends [BaseRequest](#baserequest).

| Name                          | Type                                                                                             | Description                                                                                                                                                          | Required                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| fetchPolicy                   | <code>'cache-only' &#124; 'cache-first' &#124; 'cache-and-network' &#124; 'no-cache'</code>      | [Fetch policy](#fetch-policies).                                                                                                                                     | Yes                                      |
| disableSsr                    | `boolean`                                                                                        | If `true`, the query will not be fetched on the server.                                                                                                              | No                                       |
| preventExcessRequestOnHydrate | `boolean`                                                                                        | If `true`, the query won't be fetched on the client during the hydrate stage, if there is data **or error** in the cache. `fetchPolicy` option is ignored.           | No                                       |
| forceNewRequestOnRequestMerge | `boolean`                                                                                        | If `true`, the query will start a new network request, if it's merged with the existing query.                                                                       | No                                       |
| softAbortSignal               | `AbortSignal`                                                                                    | Soft aborting should be used to indicate loss of interest in the ongoing network request. The actual request won't be aborted if there are other interested parties. | No                                       |
| fromCache                     | <code>(opts: [CacheOptions](#cacheoptions)) => [D](#user-defined-types) &#124; undefined </code> | Function for retrieving query data from cache data.                                                                                                                  | Yes, if `fetchPolicy` is not `no-cache`. |

#### BaseMutation

This type describes base mutation. It extends [BaseRequest](#baserequest).

| Name                 | Type                                                                                           | Description                                             | Required |
| -------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| optimisticData       | <code>[D](#user-defined-types)</code>                                                          | Optimistic data (optimistic response).                  | No       |
| removeOptimisticData | <code>(opts: [CacheOptionsWithData](#cacheoptionswithdata)) => [C](#user-defined-types)</code> | A function that removes optimistic data from the cache. | No       |

#### RequestOptions

| Name          | Type                                  | Description                              |
| ------------- | ------------------------------------- | ---------------------------------------- |
| requestParams | <code>[R](#user-defined-types)</code> | Arbitrary storage of request parameters. |

#### CacheOptions

| Name          | Type                                  | Description                              |
| ------------- | ------------------------------------- | ---------------------------------------- |
| cacheData     | <code>[C](#user-defined-types)</code> | Cache data.                              |
| requestParams | <code>[R](#user-defined-types)</code> | Arbitrary storage of request parameters. |
| requestId     | `string`                              | Request id.                              |

#### CacheOptionsWithData

| Name          | Type                                  | Description                                                      |
| ------------- | ------------------------------------- | ---------------------------------------------------------------- |
| cacheData     | <code>[C](#user-defined-types)</code> | Cache data.                                                      |
| requestParams | <code>[R](#user-defined-types)</code> | Arbitrary storage of request parameters.                         |
| requestId     | `string`                              | Request id.                                                      |
| data          | <code>[D](#user-defined-types)</code> | Data of the given request (from network or optimistic response). |

#### QueryRequestFlags

| Name     | Type    | Description                                                                                                                                                                                                                                                                                                                                                                                |
| -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| required | boolean | Specifies whether a network request is required, based on cache state and fetch policy of given query.                                                                                                                                                                                                                                                                                     |
| allowed  | boolean | Specifies whether a network request is allowed. It's always `true` on the client side. On the server side it may be switched to `false` based on fetch policy, existing result from the previous request, or SSR disabling. It is possible to have a query with `required: true` and `allowed: false`. Such a query should be rendered as loading on the server and fetched on the client. |

#### QueryCache

| Name  | Type                                                                | Description                                                                                                                                                                     |
| ----- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| data  | <code>[D](#user-defined-types) &#124; undefined</code>              | Data from the cache. `undefined` means no data. An unsuccessful request **will not** overwrite this field. It can be thought of as _the last known data_.                       |
| error | <code>Error &#124; [E](#user-defined-types) &#124; undefined</code> | Error from the cache. `undefined` means no error. A successful request **will** overwrite this field to `undefined`. It can be thought of as _the error from the last request_. |

#### Cache

| Name            | Type                                                                   | Description                                                                                                    |
| --------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| subscribe       | <code>(callback: () => void) => () => void</code>                      | Subscribe to the cache. The `callback` will be called on cache changes. Call returned function to unsubscribe. |
| updateState     | <code>(opts: [UpdateStateOptions](#updatestateoptions)) => void</code> | Update cache state.                                                                                            |
| getCacheData    | <code>() => [C](#user-defined-types)</code>                            | Get cache data.                                                                                                |
| getRequestError | <code>(requestId: string) => Error &#124; undefined</code>             | Get cached error for the given request id.                                                                     |
| purge           | <code>() => void</code>                                                | Reset the cache to empty state.                                                                                |

#### UpdateStateOptions

| Name  | Type                                          | Description                                                                                                                                                                                            | Required |
| ----- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| data  | <code>[C](#user-defined-types)</code>         | New cache data. Omit or set to `undefined` if no update is needed.                                                                                                                                     | No       |
| error | <code>[string, Error &#124; undefined]</code> | New error. The first element of the tuple is the request id. The second one is the error value, where `undefined` means "clear error". Omit the tuple or set it to `undefined` if no update is needed. | No       |
