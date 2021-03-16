# Fetcher Core

[![npm](https://img.shields.io/npm/v/react-fetching-hooks)](https://www.npmjs.com/package/react-fetching-hooks)

Fetcher core is dependency-free, framework-agnostic and as unopinionated as possible.

## Features

### Queries

Queries are requests that **do not** change system state. They are described as <code>[BaseQuery](#basequery)</code> objects.

### Mutations

Mutations are requests that **do** change system state. The are described as <code>[BaseMutation](#basemutation)</code> objects.

### Fetch Policies

You must specify query `fetchPolicy` to indicate how this query should be updated.

| `fetchPolicy`         | Query execution result                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'cache-only'`        | No network request. Returns state from cache.                                                                                                      |
| `'cache-first'`       | Network request, if there is no data in cache. Returns state from cache. Cache is then updated with request result (if there was network request). |
| `'cache-and-network'` | Network request regardless of cache state. Returns state from cache. Cache is then updated with request result.                                    |
| `'no-cache'`          | Network request regardless of cache state. Does not touch cache in any way.                                                                        |

### Query merging

The library encourages executing queries at arbitrary points of time. This way, any component of the application can express its own data requirements in isolation to other components.

That would lead to duplicate requests to the same resources. To prevent that, the library uses **query merging**.

Query merging works as follows. Query will reuse ongoing network request with the same id. Cache will also be updated just once, using the first _cacheable_ query that created or reused the request. A query is cacheable, if its `fetchPolicy` is not `no-cache`.

This means that queries with the same request id must update cache in the same way. It shouldn't be an issue, as the opposite makes no sense.

### Race conditions handling

Since queries (and mutations!) are executed at arbitrary points of time, there must be a way to prevent overwriting newer data by older one. This is done by **request queueing**.

Request queueing ensures that all queries, started before some mutation, are finished before that mutation is started (in no particular order). It also ensures that the next mutation will be started only after the previous one was finished.

Typical queue may look like this:

```
[a bunch of queries] -> [mutation] -> [mutation] -> [a bunch of queries]
```

It's worth noting that queued request can be aborted at any time, regardless of position in the queue.

## Public API

> ⚠ Anything that is not documented here is not considered a part of public API and may change at any time.

### Client

Client is responsible for executing queries and mutations.

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

| Name         | Type                                                          | Description                                                                                                                                                                                                                           | Required |
| ------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| query        | <code>[BaseQuery](#basequery)</code>                          | Query to execute.                                                                                                                                                                                                                     | Yes      |
| requestFlags | <code>Partial<[QueryRequestFlags](#queryrequestflags)></code> | Flags that will override internal values for this call. This way you can force-enable network request. If you want to force-disable network request, you should just use <code>[client.getQueryState()](#clientgetquerystate)</code>. | No       |

##### Return value

###### `QueryResult`

| Name         | Type                                                            | Description                                                                                                                                                                                                                                                      |
| ------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cache        | <code>[QueryCache](#querycache) &#124; undefined</code>         | Query state from cache **before network request**. Will be `undefined` if given query is not cacheable (has `fetchPolicy: 'no-cache'`).                                                                                                                          |
| requestFlags | <code>[QueryRequestFlags](#queryrequestflags)</code>            | Internal flags for given query **before network request**. Not affected by `requestFlags` argument.                                                                                                                                                              |
| request      | <code>Promise<[D](#user-defined-types)> &#124; undefined</code> | Promise representing network request. Will be `undefined`, if it wasn't required (or was required, but wasn't allowed) by internal flags, and they weren't overridden by `requestFlags` argument. Internally, there may be more than one actual network request. |

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

| Name         | Type                                                    | Description                                                                                                  |
| ------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| cache        | <code>[QueryCache](#querycache) &#124; undefined</code> | Query state from cache. Will be `undefined` if given query is not cacheable (has `fetchPolicy: 'no-cache'`). |
| requestFlags | <code>[QueryRequestFlags](#queryrequestflags)</code>    | Internal flags for given query.                                                                              |

#### `client.subscribe()`

Subscribe to state changes of given query.

```typescript
const subscription = client.subscribe(query, onChange);
```

##### Arguments

| Name     | Type                                                    | Description                  | Required |
| -------- | ------------------------------------------------------- | ---------------------------- | -------- |
| query    | <code>[BaseQuery](#basequery)</code>                    | Query.                       | Yes      |
| onChange | <code>(state: [QueryState](#querystate)) => void</code> | Callback to call on changes. | Yes      |

##### Return value

| Name        | Type                                   | Description          |
| ----------- | -------------------------------------- | -------------------- |
| queryState  | <code>[QueryState](#querystate)</code> | Current query state. |
| unsubscribe | <code>() => void</code>                | Call to unsubscribe. |

#### `client.onHydrateComplete()`

Report to client that hydrate stage is complete. Client always starts in hydrate stage, and it's a one-way operation.

```typescript
client.onHydrateComplete();
```

#### `client.purge()`

Reset client. Specifically, abort all requests and clear cache. You should call this method on logout.

```typescript
client.purge();
```

#### `client.getCache()`

Get cache that was passed to constructor.

```typescript
const cache = client.getCache();
```

##### Return value

[CACHE](#user-defined-types)

### SsrPromisesManager

SsrPromisesManager is a small helper for dealing with promises on server side.

The exact algorithm is up to you, but this seems to be the most robust way:

1. Render the app, adding promises from [QueryResult](#queryresult) as they appear.
2. Check for added promises. If there are any, wait for them, then go to 1. Otherwise go to 3.
3. The cache is now filled with data and errors.

```typescript
const ssrPromisesManager = new SsrPromisesManager();
```

#### `ssrPromisesManager.addPromise()`

Add promise to manager.

```typescript
ssrPromisesManager.addPromise(promise);
```

##### Arguments

| Name    | Type           | Description     | Required |
| ------- | -------------- | --------------- | -------- |
| promise | `Promise<any>` | Promise to add. | Yes      |

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

| Name              | Type                                                                                                                        | Description                                                                                                                                                                                                                                                                                                                                                                                         | Required |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| requestParams     | <code>[R](#user-defined-types)</code>                                                                                       | Arbitrary storage of request parameters.                                                                                                                                                                                                                                                                                                                                                            | Yes      |
| abortSignal       | `AbortSignal`                                                                                                               | Signal for aborting the request.                                                                                                                                                                                                                                                                                                                                                                    | No       |
| getRequestFactory | <code>(opts: [RequestOptions](#requestoptions)) => (abortSignal?: AbortSignal) => Promise<[D](#user-defined-types)>;</code> | Function that returns factory for creating network requests.<br/>Note that `abortSignal` for the factory is created by the library. It is **not** the same signal as `abortSignal` field of `BaseRequest`.<br/> Also note that the factory return value is actually typed as <code>Promise<D &#124; E></code>. It is done only to support error typing. You must always reject in case of an error. | Yes      |
| getRequestId      | <code>(opts: [RequestOptions](#requestoptions)) => string;</code>                                                           | Function for calculating request id. It should take some hash from `requestParams`, excluding parts that are different between client and server.                                                                                                                                                                                                                                                   | Yes      |
| toCache           | <code>(opts: [CacheOptionsWithData](#cacheoptionswithdata)) => [C](#user-defined-types);</code>                             | Function that modifies cache data based on request data (from network or from optimistic response).                                                                                                                                                                                                                                                                                                 | No       |

#### BaseQuery

This type describes base query. It extends [BaseRequest](#baserequest).

| Name                          | Type                                                                                             | Description                                                                                                                                                       | Required                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| fetchPolicy                   | <code>'cache-only' &#124; 'cache-first' &#124; 'cache-and-network' &#124; 'no-cache'</code>      | [Fetch policy](#fetch-policies).                                                                                                                                  | Yes                                      |
| disableSsr                    | `boolean`                                                                                        | If `true`, the query will not be fetched on server.                                                                                                               | No                                       |
| preventExcessRequestOnHydrate | `boolean`                                                                                        | If `true`, the query won't be fetched on client during hydrate phase, if there is data in cache. `fetchPolicy` option is ignored.                                 | No                                       |
| forceNewRequestOnRequestMerge | `boolean`                                                                                        | If `true`, the query will start new network request, if it's merged with existing query.                                                                          | No                                       |
| softAbortSignal               | `AbortSignal`                                                                                    | Soft aborting should be used to indicate loss of interest in ongoing network request. The actual request won't be aborted, if there are other interested parties. | No                                       |
| fromCache                     | <code>(opts: [CacheOptions](#cacheoptions)) => [D](#user-defined-types) &#124; undefined </code> | Function for retrieving query data from cache data.                                                                                                               | Yes, if `fetchPolicy` is not `no-cache`. |

#### BaseMutation

This type describes base mutation. It extends [BaseRequest](#baserequest).

| Name                 | Type                                                                                           | Description                                       | Required |
| -------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------- |
| optimisticData       | <code>[D](#user-defined-types)</code>                                                          | Optimistic data (optimistic response).            | No       |
| removeOptimisticData | <code>(opts: [CacheOptionsWithData](#cacheoptionswithdata)) => [C](#user-defined-types)</code> | Function that removes optimistic data from cache. | No       |

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

| Name          | Type                                  | Description                                                  |
| ------------- | ------------------------------------- | ------------------------------------------------------------ |
| cacheData     | <code>[C](#user-defined-types)</code> | Cache data.                                                  |
| requestParams | <code>[R](#user-defined-types)</code> | Arbitrary storage of request parameters.                     |
| requestId     | `string`                              | Request id.                                                  |
| data          | <code>[D](#user-defined-types)</code> | Data of given request (from network or optimistic response). |

#### QueryRequestFlags

| Name     | Type    | Description                                                                                                                                                                                                                                                                                                                                                    |
| -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| required | boolean | Specifies whether a network request is required, based on cache state and fetch policy of given query.                                                                                                                                                                                                                                                         |
| allowed  | boolean | Specifies whether network request is allowed. It's always `true` on client side. On server side it may be switched to `false` based on fetch policy, data or error from previous request, or SSR disabling. It is possible to have query with `required: true` and `allowed: false`. Such query should be rendered as loading on server and fetched on client. |

#### QueryCache

| Name  | Type                                                                | Description                                   |
| ----- | ------------------------------------------------------------------- | --------------------------------------------- |
| error | <code>Error &#124; [E](#user-defined-types) &#124; undefined</code> | Error from cache. `undefined` means no error. |
| data  | <code>[D](#user-defined-types) &#124; undefined</code>              | Data from cache. `undefined` means no data.   |

#### Cache

TODO.
