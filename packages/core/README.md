# Galaxis Core

[![npm](https://img.shields.io/npm/v/@galaxis/core)](https://www.npmjs.com/package/@galaxis/core)

[Apollo](https://www.apollographql.com)-inspired backend-agnostic fetching library with full SSR support.

This package contains core [Galaxis](/README.md#galaxis-) functionality, which is dependency-free, framework-agnostic and as unopinionated as possible.

## Installation

```
yarn add @galaxis/core
```

Note that you should use a framework-specific wrapper (such as Galaxis [React](/packages/react#galaxis-react) or Galaxis [Vue](/packages/react#galaxis-vue)) and not install Galaxis Core directly.

The library is compiled to modern JS, but it should work in all reasonable browsers with the help of properly configured Babel.

Your client environment has to have `AbortController`. You might need to polyfill it.

## Features

### Queries

Queries are requests that **do not** change the system state. They are described as <code>[Query](#query)</code> objects. Note that some options are ignored in the contexts where they are not applicable.

You can work with queries manually via <code>[client.query()](#clientquery)</code>, <code>[client.fetchQuery()](#clientfetchquery)</code>, <code>[client.readQuery()](#clientreadquery)</code> and <code>[client.watchQuery()](#clientwatchquery)</code>, or you can create an <code>[ObservableQuery](#observablequery)</code>. Note that observable queries should be hidden behind some framework-specific wrapper. The library provides <code>[useQuery](../react#usequery)</code> for React and <code>[useQuery](../vue#usequery)</code> for Vue.

A query _execution_ may or may not result in returning the state (data and error) from the cache and/or performing a network request, depending on the <code>[fetchPolicy](#fetchpolicy)</code> option and the cache state.

A query can also be _(re)fetched_ from the network, which always leads to a network request.

### Mutations

Mutations are requests that **do** change the system state. They are described as <code>[Mutation](#mutation)</code> objects.

You can work with mutations manually via <code>[client.mutate()](#clientmutate)</code>, or you can create an <code>[ObservableMutation](#observablemutation)</code>. Note that observable mutations should be hidden behind some framework-specific wrapper. The library provides <code>[useMutation](../react#usemutation)</code> for React and <code>[useMutation](../vue#usemutation)</code> for Vue.

A mutation _execution_ always leads to a network request.

### Shared Cache

Queries and mutations work with the same shared <code>[Cache](#cache)</code>. That means that a query can use the data (and/or error!) that was fetched by another query, and query data can be indirectly updated by a mutation. The library provides <code>[InMemoryCache](../in-memory-cache#inmemorycache)</code> as a recommended cache.

Cache usage is specified by the <code>[fetchPolicy](#fetchpolicy)</code> option. You can opt-out of caching by using `fetchPolicy: 'no-cache'`. Note that if `fetchPolicy` is not `'no-cache'`, you also need to specify the `toCache()` and, in case of queries, `fromCache()` options, or the caching will appear broken.

Query errors are automatically cached by the network request id depending on the `fetchPolicy`.

Mutation errors are never cached.

### Optimistic Responses

You can specify `optimisticData` for mutations. During mutation execution, the cache will immediately be updated with this data, and then with the real data when it arrives. In case of an error, the cache will be reverted to a state without the optimistic data, but with subsequent changes.

As expected, `fetchPolicy: 'no-cache'` disables optimistic response.

### Query Merging

The library encourages executing queries at arbitrary parts of code and points in time. This way, any component of the application can express its data requirements in isolation from other components.

That would lead to duplicate network requests to the same resources. To prevent that, the library uses **query merging**.

Query merging means that if a query execution (or fetching) results in performing a network request, the library will reuse an ongoing network request with the same id, if there is one. Network request id is calculated by the <code>[client.requestId()](#clientrequestid)</code> function.

The cache will also be updated by all queries, which enables different cache updates for queries with the same network request id. It's discouraged, but not strictly forbidden.

You can't really opt-out of query merging, but you can use the `forceRequestOnMerge` option of <code>[Query](#query)</code> to force a new network request (essentially re-run the existing one) if this query is being merged with another. This means that a promise representing a network request may hide more than one actual network request behind it.

### Request Queueing

Since queries (and mutations!) are executed at arbitrary points in time, there must be a way to prevent overwriting newer data by the older one. This is done by **request queueing**.

Request queueing ensures that all queries, which were started before some mutation, are finished before that mutation is started (in no particular order). It also ensures that the next mutation will be started only after the previous one was finished.

A typical queue may look like this:

```
[a bunch of queries] -> [a mutation] -> [a mutation] -> [a bunch of queries]
```

Note that request queueing means that a promise representing a network request may hide an actual network request that wasn't started yet. Such a request can still be aborted at any time, regardless of its position in the queue.

### Race Conditions Handling

Query merging and request queueing, alongside other techniques, make sure that there are no race conditions, **as long as data from queries with different network request ids does not overlap**. Even if it does, you are still fine, if you only change the system state by mutations, since you don't really care in which order the same data arrives.

Otherwise, beware that you have a razor-thin chance of overwriting an up-to-date data with an outdated one, if you execute such queries simultaneously. In the future, the library may provide means for relative queueing of such queries.

### Full Server-Side Rendering Support

The library is built with SSR in mind. _Observable queries_ can be executed on the server side, and, assuming they are wrapped in a framework-specific wrapper, there is no SSR-specific code in the application components, so they are SSR-ready by default. Note that you can disable fetching on the server by the `disableSsr` option of <code>[Query](#query)</code>.

The server waits until all network requests of _observable queries_ are finished and the cache is filled with data and errors, then renders the app based on the cache, and sends resulting HTML with embedded cache to the client.

The exact server rendering logic is framework-specific. The library provides <code>[getDataFromTree](../react#getdatafromtree)</code> for React and relies on the built-in SSR functionality of Vue.

### Hydrate Stage Optimization

If you're doing SSR, you're going to have a hydrate stage on the client, which is the initial render with cached data. By default, queries with `fetchPolicy: 'cache-and-network'` will be fetched during the hydrate stage. This is likely undesirable because these requests were just performed on the server.

It can be fixed by setting `optimizeOnHydrate: true` for all queries by default. In general, you should always do that, unless your cache is not coming from just-performed requests (e.g. you're caching the SSR results, or not doing SSR, but persist the cache to local storage, etc.).

Note that you have to indicate that the hydrate stage is complete by calling <code>[client.onHydrateComplete()](#clientonhydratecomplete)</code>.

### High Customizability

The library is completely unopinionated about the network level. You can use fetch, axios, XMLHttpRequest, or any other solution. You can add network requests logging, retries, or timeouts. The library doesn't care in which format your data arrives. Just provide the `request` option of <code>[BaseRequest](#baserequest)</code> that will abstract it all away. The library provides <code>[Fetch](/packages/fetch#galaxis-fetch)</code> as a recommended network interface.

The library is also unopinionated about <code>[Cache](#cache)</code> internals. You can add cache invalidation or persistence, partial or complete. You even should be able to integrate the cache with your own state management solution, should you need so. The library provides <code>[InMemoryCache](../in-memory-cache#inmemorycache)</code> as a recommended cache.

Note that almost everything is configurable on a per-request level. For instance, you can use different network interfaces for different queries!

### Caveats / known issues

#### Cache data is decoupled from requests

By desing, the cache data, unlike errors, is decoupled from actual queries and mutations that update it. It means that when some query data is updated by another query or mutation, the corresponding error can't and won't be cleared. It can lead to funny situations.

For instance, suppose there is a query `Q` that queries some entity that's initially absent, and there is a mutation `M` that creates this entity. `Q` gets executed, which results in a 404 error. Then `M` is executed, which results in the entity creation. The cache is updated, and now `Q` has both the newly created entity and the existing 404 error.

Without battle testing it's not clear whether it's a fundamental flaw or a minor quirk. Maybe it can be fixed on the _observable queries_ level by ignoring data updates while there is an error.

#### Optimistic data is treated as usual data

There is no way to distinguish optimistic data from real data. This leads to several issues:

-   Optimistic data will prevent a query with `fetchPolicy: 'cache-first'` from performing a network request. This one can actually be fixed, because the cache can be updated to provide the real data alongside the optimistic one.
-   Optimistic data may "stuck" in _observable queries_ just like real data. It's likely impossible to fix without coupling the data with corresponding queries and mutations. It actually happens in Apollo, so it probably should stay as it is.

## Public API

> ⚠ Anything that is not documented here is not considered a part of public API and may change at any time.

### Client

`Client` is the heart of the library that does all the heavy-lifting.

```typescript
const client = new Client({
    cache: new MyCache(),
    requestId,
    defaultRequest,
    defaultQuery,
    defaultMutation,
});
```

##### Arguments

###### `ClientOptions`

> ⚠ Note that defaults are static for the given client instance. Dynamic defaults would add too much complexity. If you really need dynamic defaults, such as a user-specific header that is common for all requests, you should do it on the network level, somewhere inside the `request` option of the <code>[BaseRequest](#baserequest)</code>. Ideally, if we're talking about authorization, you should rely on a `HttpOnly` cookie set by the server.

| Name            | Type                                                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                       | Required |
| --------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| cache           | <code>[CACHE](#user-defined-types)</code>                    | A cache for storing normalized data and errors. The library provides <code>[InMemoryCache](../in-memory-cache#inmemorycache)</code> that should work in a lot of cases.                                                                                                                                                                                                                                                           | Yes      |
| requestId       | <code>(resource: [BR](#user-defined-types)) => string</code> | A function for hashing the `resource` field of <code>[BaseRequest](#baserequest)</code>. The resulting hash is considered the network request id. The library provides <code>[objectHash()](../utils#objecthash)</code> that should work in a lot of cases. If you only use the <code>[Fetch](../fetch)</code> network interface, consider its <code>[requestId()](../fetch#requestId)</code> for a bit more human-readable hash. | Yes      |
| defaultRequest  | <code>Partial<[BaseRequest](#baserequest)></code>            | Default request. Can't be changed later. Merged shallowly.                                                                                                                                                                                                                                                                                                                                                                        | No       |
| defaultQuery    | <code>Partial<[Query](#query)></code>                        | Default query. Can't be changed later. Merged shallowly.                                                                                                                                                                                                                                                                                                                                                                          | No       |
| defaultMutation | <code>Partial<[Mutation](#mutation)></code>                  | Default mutation. Can't be changed later. Merged shallowly.                                                                                                                                                                                                                                                                                                                                                                       | No       |

#### `client.query()`

Execute the query and optionally subscribe to the changes in its state.

```typescript
const [queryState, request, unsubscribe] = client.query(query, onChange);
```

##### Arguments

| Name     | Type                                                    | Description                                             | Required |
| -------- | ------------------------------------------------------- | ------------------------------------------------------- | -------- |
| query    | <code>[Query](#query)</code>                            | A query to execute.                                     | Yes      |
| onChange | <code>(state: [QueryState](#querystate)) => void</code> | A callback to call when the state of the query changes. | No       |

##### Return value

| Name        | Type                                                            | Description                                                                                                                                                                                                    |
| ----------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| queryState  | <code>[QueryState](#querystate)</code>                          | The state of the given query.                                                                                                                                                                                  |
| request     | <code>Promise<[D](#user-defined-types)> &#124; undefined</code> | A promise representing network request. It will be `undefined`, if it wasn't required (or was required, but wasn't allowed on the server side). Internally, there may be more than one actual network request. |
| unsubscribe | <code>(() => void) &#124; undefined</code>                      | A function for unsubscribing from query state updates. Will be `undefined` if no `onChange` callback was passed, or if the query itself is not cacheable.                                                      |

#### `client.fetchQuery()`

Fetch the query. If the `fetchPolicy` is `cache-only`, the returned promise will be immediately rejected. Otherwise, this method will always create a network request.

```typescript
const result = client.fetchQuery(query);
```

##### Arguments

| Name  | Type                         | Description       | Required |
| ----- | ---------------------------- | ----------------- | -------- |
| query | <code>[Query](#query)</code> | A query to fetch. | Yes      |

##### Return value

<code>Promise<[D](#user-defined-types)></code>

#### `client.readQuery()`

Get state of the given query.

```typescript
const queryState = client.readQuery(query);
```

##### Arguments

| Name  | Type                         | Description      | Required |
| ----- | ---------------------------- | ---------------- | -------- |
| query | <code>[Query](#query)</code> | A query to read. | Yes      |

##### Return value

###### `QueryState`

| Name            | Type                                                                | Description                                                                                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| data            | <code>[D](#user-defined-types) &#124; undefined</code>              | Data from the cache. `undefined` means no data. An unsuccessful request **will not** overwrite this field. Can be updated by other query or mutation. It can be thought of as _the last known data_. Always `undefined` for non-cacheable query. |
| error           | <code>[E](#user-defined-types) &#124; Error &#124; undefined</code> | Error from the cache. `undefined` means no error. A successful request **will** overwrite this field to `undefined`. It can be thought of as _the error from the last request_. Always `undefined` for non-cacheable query.                      |
| requestRequired | <code>boolean</code>                                                | Specifies whether a network request is required, based on cache state and fetch policy of the given query. The actual network request may still not be allowed on the server side. If `true`, the query should be rendered with `loading: true`. |

#### `client.watchQuery()`

Get state of the given query and subscribe to its changes.

```typescript
const [queryState, unsubscribe] = client.watchQuery(query, onChange);
```

##### Arguments

| Name     | Type                                                    | Description                                             | Required |
| -------- | ------------------------------------------------------- | ------------------------------------------------------- | -------- |
| query    | <code>[Query](#query)</code>                            | A query to read.                                        | Yes      |
| onChange | <code>(state: [QueryState](#querystate)) => void</code> | A callback to call when the state of the query changes. | Yes      |

##### Return value

| Name        | Type                                     | Description                                                                      |
| ----------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| queryState  | <code>[QueryState](#querystate)</code>   | The state of the given query.                                                    |
| unsubscribe | <code>() => void &#124; undefined</code> | A function for unsubscribing. Will be `undefined` if the query is not cacheable. |

#### `client.mutate()`

Execute the mutation.

```typescript
const mutationResult = client.mutate(mutation);
```

##### Arguments

| Name     | Type                               | Description            | Required |
| -------- | ---------------------------------- | ---------------------- | -------- |
| mutation | <code>[Mutation](#mutation)</code> | A mutation to execute. | Yes      |

##### Return value

<code>Promise<[D](#user-defined-types)></code>

#### `client.reset()`

Reset the client. Specifically:

-   Clear the cache (reset it to empty state).
-   Rerun all ongoing network requests of queries.
-   Ignore results of ongoing network requests of mutations.
-   Notify the subscribers that there was a reset.

You should call this method right after logout.

If you only want to invalidate all cached data, you can call `client.getCache().clear()`.

```typescript
client.reset();
```

#### `client.onReset()`

Subscribe to client reset.

```typescript
const unsubscribe = client.onReset(onReset);
```

##### Arguments

| Name    | Type                    | Description                         | Required |
| ------- | ----------------------- | ----------------------------------- | -------- |
| onReset | <code>() => void</code> | A callback ro call on client reset. | Yes      |

##### Return value

<code>() => void</code>

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

#### `client.requestId()`

Get hash of the given `resource` using the `requestId` function that was passed to the constructor.

```typescript
const hash = client.hash(request.resource);
```

##### Arguments

| Name     | Type                                   | Description           | Required |
| -------- | -------------------------------------- | --------------------- | -------- |
| resource | <code>[BR](#user-defined-types)</code> | A `resource` to hash. | Yes      |

##### Return value

<code>string</code>

### Important Types

#### User-defined types

| Name    | Scope            | Constraint                                             | Description                                                                       |
| ------- | ---------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `CACHE` | Client-specific  | Must extend <code>[Cache](#cache)</code>               | Cache for storing normalized data and errors.                                     |
| `C`     | Client-specific  | Must extend <code>[NonUndefined](#nonundefined)</code> | Cache data. Normalized data from all requests.                                    |
| `BD`    | Client-specific  | Must extend <code>[NonUndefined](#nonundefined)</code> | Query or mutation data, common for all requests. Used for defaults.               |
| `BE`    | Client-specific  | Must extend `Error`                                    | Query or mutation error, common for all requests. Used for defaults.              |
| `BR`    | Client-specific  | Must extend <code>[Resource](#resource)</code>         | Query or mutation request parameters, common for all requests. Used for defaults. |
| `D`     | Request-specific | Must extend <code>BD</code>                            | Query or mutation data.                                                           |
| `E`     | Request-specific | Must extend `BE`                                       | Query or mutation error.                                                          |
| `R`     | Request-specific | Must extend `BR`                                       | Query or mutation request parameters.                                             |

##### `NonUndefined`

Anything but `undefined`.

##### `Resource`

The constraint for request `resource`.

| Name | Type     | Description                                                                                                                                                          | Required |
| ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| key  | `string` | Globally unique identifier of the resource. It's better to specify something that will actually be used for the request, like the resource URL (like `/entity/:id`). | Yes      |

#### `BaseRequest`

This type describes base request fields that are common for queries and mutations.

| Name        | Type                                                                                                               | Description                                                                                                                                                                            | Required                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| resource    | <code>[R](#user-defined-types)</code>                                                                              | An object that uniquely describes the given resource. Usually contains request parameters.                                                                                             | Yes                                                 |
| abortSignal | `AbortSignal`                                                                                                      | Signal for aborting the request.                                                                                                                                                       | No                                                  |
| request     | <code>(resource: [R](#user-defined-types), abortSignal?: AbortSignal) => Promise<[D](#user-defined-types)>;</code> | A factory for creating network requests.<br/>Note that `abortSignal` for the factory is created by the library. It is **not** the same signal as `abortSignal` field of `BaseRequest`. | No, a rejected promise will be used by default      |
| toCache     | <code>(opts: [ToCacheOptions](#tocacheoptions)) => [C](#user-defined-types);</code>                                | A function that modifies cache data based on request data (from network or optimistic response).                                                                                       | No, the cache data will not be modified by default. |

#### `Query`

Extends [BaseRequest](#baserequest).

| Name                | Type                                                                                                     | Description                                                                                                                                                          | Required                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| fetchPolicy         | <code>[FetchPolicy](#fetchpolicy)</code>                                                                 | [FetchPolicy](#fetchpolicy).                                                                                                                                         | No, `'cache-and-network'` is used by default.                |
| disableSsr          | `boolean`                                                                                                | If `true`, the query will not be fetched on the server.                                                                                                              | No                                                           |
| optimizeOnHydrate   | `boolean`                                                                                                | If `true`, the query won't be fetched on the client during the hydrate stage, if there is data **or error** in the cache. `fetchPolicy` option is ignored.           | No                                                           |
| forceRequestOnMerge | `boolean`                                                                                                | If `true`, the query will start a new network request, if it's merged with the existing query.                                                                       | No                                                           |
| softAbortSignal     | `AbortSignal`                                                                                            | Soft aborting should be used to indicate loss of interest in the ongoing network request. The actual request won't be aborted if there are other interested parties. | No                                                           |
| fromCache           | <code>(opts: [FromCacheOptions](#fromcacheoptions)) => [D](#user-defined-types) &#124; undefined </code> | A function for retrieving query data from cache data.                                                                                                                | No, a function returning `undefined` will be used by default |

#### `Mutation`

Extends [BaseRequest](#baserequest).

| Name           | Type                                     | Description                            | Required                                      |
| -------------- | ---------------------------------------- | -------------------------------------- | --------------------------------------------- |
| fetchPolicy    | <code>[FetchPolicy](#fetchpolicy)</code> | [FetchPolicy](#fetchpolicy).           | No, `'cache-and-network'` is used by default. |
| optimisticData | <code>[D](#user-defined-types)</code>    | Optimistic data (optimistic response). | No                                            |

##### `FromCacheOptions`

| Name      | Type                                  | Description                                         |
| --------- | ------------------------------------- | --------------------------------------------------- |
| cacheData | <code>[C](#user-defined-types)</code> | Cache data.                                         |
| resource  | <code>[R](#user-defined-types)</code> | The `resource` of the corresponding query/mutation. |
| requestId | `string`                              | Network request id.                                 |

##### `ToCacheOptions`

Extends <code>[FromCacheOptions](#fromcacheoptions)</code>

| Name | Type                                  | Description                                                      |
| ---- | ------------------------------------- | ---------------------------------------------------------------- |
| data | <code>[D](#user-defined-types)</code> | Data of the given request (from network or optimistic response). |

##### `FetchPolicy`

| `fetchPolicy`         | Query execution result                                                                                                                                               | Mutation execution result                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `'cache-only'`        | No network request. Returns state from the cache.                                                                                                                    | N/A                                                                                                      |
| `'cache-first'`       | Network request, if there is no data in the cache. Returns state from the cache. The cache is then updated with the request result (if there was a network request). | N/A                                                                                                      |
| `'cache-and-network'` | Network request regardless of the cache state. Returns state from the cache. The cache is then updated with the request result.                                      | Network request regardless of the cache state. The cache _data_ is then updated with the request result. |
| `'no-cache'`          | Network request regardless of the cache state. Does not touch the cache in any way.                                                                                  | Network request regardless of the cache state. Does not touch the cache in any way.                      |

#### `Cache`

| Name      | Type                                                         | Description                                                                                                    |
| --------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| subscribe | <code>(callback: () => void) => () => void</code>            | Subscribe to the cache. The `callback` will be called on cache changes. Call returned function to unsubscribe. |
| update    | <code>(opts: [UpdateOptions](#updateoptions)) => void</code> | Update cache state.                                                                                            |
| getData   | <code>() => [C](#user-defined-types)</code>                  | Get cache data.                                                                                                |
| getError  | <code>(requestId: string) => Error &#124; undefined</code>   | Get cached error for the given request id.                                                                     |
| clear     | <code>() => void</code>                                      | Reset the cache to empty state.                                                                                |

##### `UpdateOptions`

| Name           | Type                                                                                       | Description                                                                                                                                                                                                                                  | Required |
| -------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| data           | <code>(prevData: [C](#user-defined-types)) => [C](#user-defined-types)</code>              | A function that returns new data based on the previous one.                                                                                                                                                                                  | No       |
| errors         | <code>Record<string, (prevError: Error &#124; undefined) => Error &#124; undefined></code> | A dictionary of errors that need to be updated. The keys are the network request ids, and the values are functions that return new errors based on the previous ones.                                                                        | No       |
| createSplitFor | `unknown`                                                                                  | A truthy value that will be compared by reference. If passed, the cache will split its state (or states in case of multiple splits) in two and apply the updates only to one copy, and the copy will be associated with the passed value.    | No       |
| clearSplitFor  | `unknown`                                                                                  | A truthy value that will be compared by reference. If passed, the cache will drop the corresponding copy of its state, essentially reverting to a state that only lacks the updates introduced by the split, but has all subsequent changes. | No       |
