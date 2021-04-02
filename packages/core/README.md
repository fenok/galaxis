# Galaxis Core

[![npm](https://img.shields.io/npm/v/@galaxis/core)](https://www.npmjs.com/package/@galaxis/core)

[Apollo](https://www.apollographql.com)-inspired backend-agnostic fetching library with full SSR support.

This package contains core [Galaxis](/README.md#galaxis-) functionality, which is dependency-free, framework-agnostic and as unopinionated as possible.

## Installation

```
yarn add @galaxis/core
```

Note that you should use a framework-specific wrapper (such as Galaxis [React](/packages/react#galaxis-react)) and not install Fecther Core directly.

The library is compiled to modern JS, but it should work in all reasonable browsers with the help of properly configured Babel.

Your client environment has to have `AbortController`. You might need to polyfill it.

## Features

### Queries

Queries are requests that **do not** change the system state. They are described as <code>[Query](#query)</code> objects. Note that some options are ignored in the contexts where they are not applicable. For instance, the `lazy` option only works for _managed queries_.

You can work with queries manually via <code>[client.query()](#clientquery)</code>, <code>[client.fetchQuery()](#clientfetchquery)</code> and <code>[client.readQuery()](#clientreadquery)</code>, or you can create a _managed query_ via <code>[client.manageQuery()](#clientmanagequery)</code>. Note that managed queries should be hidden behind some framework-specific wrapper. The library provides <code>[useQuery](../react#usequery)</code> for React.

A query _execution_ may or may not result in returning the state (data and error) from the cache and/or performing a network request, depending on the <code>[fetchPolicy](#fetchpolicy)</code> and the cache state.

A query can also be _(re)fetched_ from the network, which always leads to a network request.

### Mutations

Mutations are requests that **do** change the system state. They are described as <code>[Mutation](#mutation)</code> objects.

You can work with mutations manually via <code>[client.mutate()](#clientmutate)</code>, or you can create a _managed mutation_ via <code>[client.manageMutation()](#clientmanagemutation)</code>. Note that managed mutations should be hidden behind some framework-specific wrapper. The library provides <code>[useMutation](../react#usemutation)</code> for React.

A mutation _execution_ always leads to a network request.

### Shared Cache

Queries and mutations work with the same shared <code>[Cache](#cache)</code>. That means that a query can use the data (and/or error!) that was fetched by another query, and query data can be indirectly updated by a mutation. The library provides <code>[InMemoryCache](../in-memory-cache#inmemorycache)</code> as a recommended cache.

For queries, cache usage is specified by `fetchPolicy` option. Note that if `fetchPolicy` is not `'no-cache'`, you also need to specify `toCache()` and `fromCache()` options, or the caching will appear broken. Query errors are automatically cached by the network request id depending on `fetchPolicy`. You can opt-out of caching by using `fetchPolicy: 'no-cache'`.

For mutations, cache usage is specified by existense of `toCache()` option. Mutation errors are never cached. You can opt-out of caching by omitting this option (or setting it to `undefined`).

### Optimistic Responses

You can specify `optimisticData` for mutations. During mutation execution, the cache will immediately be updated with this data, and then with the real data when it arrives. Note that you also have to specify the `removeOptimisticData()` and `toCache()` functions, so the library knows how to remove the optimistic data from the cache, and how to put the real data in.

### Query Merging

The library encourages executing queries at arbitrary parts of code and points in time. This way, any component of the application can express its data requirements in isolation from other components.

That would lead to duplicate network requests to the same resources. To prevent that, the library uses **query merging**.

Query merging means that if a query execution (or fetching) results in performing a network request, the library will reuse an ongoing network request with the same id, if there is one. Network request id is calculated by the `getRequestId` function of <code>[BaseRequest](#baserequest)</code>.

The cache will also be updated just once, using the first _cacheable_ query that created or reused the network request. A query is cacheable if its `fetchPolicy` is not `no-cache`.

This means that queries with the same network request id must update the cache in the same way. It shouldn't be an issue, as the opposite makes no sense.

You can't really opt-out of query merging, but you can use the `forceRequestOnMerge` option of <code>[Query](#query)</code> to force a new network request (essentially re-run the existing one) if this query is being merged with another. This means that a promise representing a network request may hide more than one actual network request behind it.

### Request Queueing

Since queries (and mutations!) are executed at arbitrary points in time, there must be a way to prevent overwriting newer data by the older one. This is done by **request queueing**.

Request queueing ensures that all queries, which were started before some mutation, are finished before that mutation is started (in no particular order). It also ensures that the next mutation will be started only after the previous one was finished.

A typical queue may look like this:

```
[a bunch of queries] -> [mutation] -> [mutation] -> [a bunch of queries]
```

Note that request queueing means that a promise representing a network request may hide an actual network request that wasn't started yet. Such a request can still be aborted at any time, regardless of its position in the queue.

### Race Conditions Handling

Query merging and request queueing, alongside other techniques, make sure that there are no race conditions, **as long as data from queries with different network request ids does not overlap**. Even if it does, you are still fine, if you only change the system state by mutations, since you don't really care in which order the same data arrives.

Otherwise, beware that you have a razor-thin chance of overwriting an up-to-date data with an outdated one, if you execute such queries simultaneously. In the future, the library may provide means for relative queueing of such queries.

### Full Server-Side Rendering Support

The library is built with SSR in mind. _Managed queries_ can be executed on the server side, and, assuming they are wrapped in a framework-specific wrapper, there is no SSR-specific code in the application components, so they are SSR-ready by default. Note that you can disable fetching on the server by the `disableSsr` option of <code>[Query](#query)</code>.

The server uses an instance of <code>[SsrPromisesManager](#ssrpromisesmanager)</code> to wait until all _managed queries_ network requests are finished and the cache is filled with data and errors, then renders the app based on the cache, and sends resulting HTML with embedded cache to the client.

The exact server rendering logic and means of providing a <code>[SsrPromisesManager](#ssrpromisesmanager)</code> instance to managed queries are framework-specific. The library provides <code>[getDataFromTree](../react#getdatafromtree)</code> for React.

### Hydrate Stage Optimization

If you're doing SSR, you're going to have a hydrate stage on the client, which is the initial render with cached data. By default, queries with `fetchPolicy: 'cache-and-network'` will be fetched during the hydrate stage. This is likely undesirable because these requests were just performed on the server.

It can be fixed by setting `optimizeOnHydrate: true` for all queries by default. In general, you should always do that, unless your cache is not coming from just-performed requests (e.g. you are not doing SSR, but persist the cache to local storage).

Note that you have to indicate that the hydrate stage is complete by calling <code>[client.onHydrateComplete()](#clientonhydratecomplete)</code>.

### High Customizability

The library is completely unopinionated about the network level. You can use fetch, axios, XMLHttpRequest, or any other solution. You can add network requests logging, retries, or timeouts. The library doesn't care in which format your data arrives. Just provide a `getRequestFactory` option of <code>[BaseRequest](#baserequest)</code> that will abstract it all away. The library provides <code>[Fetch](/packages/fetch#galaxis-fetch)</code> as a recommended network interface.

The library is also unopinionated about <code>[Cache](#cache)</code> internals. You can add cache persistence, partial or complete. You even should be able to integrate the cache with your own state management solution, should you need so. The library provides <code>[InMemoryCache](../in-memory-cache#inmemorycache)</code> as a recommended cache.

Note that almost everything is configurable on a per-request level. For instance, you can use different network interfaces for different queries!

## Public API

> ⚠ Anything that is not documented here is not considered a part of public API and may change at any time.

### Client

`Client` is the heart of the library that does all the heavy-lifting.

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

> ⚠ Note that defaults are static for the given client instance. Dynamic defaults would add too much complexity. If you really need dynamic defaults, such as a user-specific header that is common for all requests, you should do it on the network level, somewhere inside the `getRequestFactory` option of the <code>[BaseRequest](#baserequest)</code>. Ideally, if we're talking about authorization, you should rely on a `HttpOnly` cookie set by the server.

| Name            | Type                                                   | Description                                                                                                                                                                                                                                                                                                | Required |
| --------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| cache           | <code>[CACHE](#user-defined-types)</code>              | A cache for storing normalized data and errors. The library provides <code>[InMemoryCache](../in-memory-cache#inmemorycache)</code> that should work in a lot of cases.                                                                                                                                    | Yes      |
| merge           | <code>(r1: R1, r2: R2, r3: R3) => R1 & R2 & R3;</code> | A function for merging queries and mutations with defaults. `R1` is `defaultRequest`, `R2` is `defaultQuery` or `defaultMutation` and `R3` is the given query or mutation. The library provides <code>[mergeDeepNonUndefined()](../utils#mergedeepnonundefined)</code> that should work in a lot of cases. | Yes      |
| hash            | <code>(value: unknown) => string</code>                | A function for hashing <code>[BaseRequest](#baserequest)</code>, <code>[Query](#query)</code> or <code>[Mutation](#mutation)</code> objects, and their `requestParams` fields. The library provides <code>[objectHash()](../utils#objecthash)</code> that should work in a lot of cases.                   | Yes      |
| defaultRequest  | <code>Partial<[BaseRequest](#baserequest)></code>      | Default request. Can't be changed later.                                                                                                                                                                                                                                                                   | No       |
| defaultQuery    | <code>Partial<[Query](#baserequest)></code>            | Default query. Can't be changed later.                                                                                                                                                                                                                                                                     | No       |
| defaultMutation | <code>Partial<[Mutation](#baserequest)></code>         | Default mutation. Can't be changed later.                                                                                                                                                                                                                                                                  | No       |

#### `client.manageQuery()`

Starts managing of the given query. If the query is not `lazy`, it is executed immediately.

Note that this method is supposed to be wrapped in some framework-specific wrapper. You should use <code>[client.query()](#clientquery)</code>, <code>[client.fetchQuery()](#clientfetchquery)</code> and <code>[client.readQuery()](#clientreadquery)</code> to work with queries manually.

```typescript
const [result, dispose] = client.manageQuery(query, onChange, ssrPromisesManager);
```

##### Arguments

| Name               | Type                                                                     | Description                                                                                                                                                       | Required |
| ------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| query              | <code>[Query](#query) &#124; undefined</code>                            | A query to create a manager for. Pass `undefined` to create an empty manager. It's useful when you can't call the function optionally, e.g. in React Hooks.       | Yes      |
| onChange           | <code>(result: [QueryManagerResult](#querymanagerresult)) => void</code> | A callback that will be called when the state of the manager changes.                                                                                             | Yes      |
| ssrPromisesManager | <code>[SsrPromisesManager](#ssrpromisesmanager)</code>                   | Should only be passed on the server side. If a non-`lazy` query produces a network request during its initial execution, it is added to the `ssrPromisesManager`. | No       |

##### Return value

| Name    | Type                                                   | Description                                                                                                                        |
| ------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| result  | <code>[QueryManagerResult](#querymanagerresult)</code> | Current manager state and API for manipulating it.                                                                                 |
| dispose | <code>() => void</code>                                | Call it when you don't need the manager anymore to perform the internal cleanup. The ongoing network request will be soft-aborted. |

##### Related types

###### `QueryManagerResult`

| Name     | Type                                                                | Description                                                                                                                                                                                                                                                                                                                  |
| -------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| data     | <code>[D](#user-defined-types) &#124; undefined</code>              | The last known data of the query, **stored inside the manager**. Can be updated by the cache update, depending on the `fetchPolicy`.                                                                                                                                                                                         |
| error    | <code>[E](#user-defined-types) &#124; Error &#124; undefined</code> | The error from the last network request, **stored inside the manager**. Can be updated by the cache update, depending on the `fetchPolicy`.                                                                                                                                                                                  |
| loading  | <code>boolean</code>                                                | If `true`, there is a network request in progress, **initiated by the manager**. If the query is loading, its `data` and `error` updates are paused.                                                                                                                                                                         |
| executed | <code>boolean</code>                                                | If `true`, the query was executed. Initially `true` for non-`lazy` queries, and it's switched to `true` after the first call of `execute`.                                                                                                                                                                                   |
| execute  | <code>() => [QueryResult](#queryresult)</code>                      | Call it to execute the query. If the query is already `executed`, you most likely want to `refetch` it instead. Note that query execution will immediately update the `data` and `error` fields with the cached values (`undefined` in case of `fetchPolicy: 'no-cache'`). The ongoing network request will be soft-aborted. |
| refetch  | <code>() => Promise<[D](#user-defined-types)></code>                | Call it to fetch the query from the network, even for `fetchPolicy: cache-only`. The query has to be executed first. Note that this method will **always** (`forceRequestOnMerge: true`) create a new network request, aborting the previous one.                                                                            |
| abort    | <code>() => void</code>                                             | Call it to abort current network request. If there is no network request in progress, it's a no-op.                                                                                                                                                                                                                          |
| reset    | <code>() => void</code>                                             | Call it to reset the manager to the non-executed state. This will reset `data` and `error` to `undefined` and `executed` to `false`. The ongoing network request will be soft-aborted.                                                                                                                                       |

#### `client.manageMutation()`

Starts managing of the given mutation.

Note that this method is supposed to be wrapped in some framework-specific wrapper. You should use <code>[client.mutate()](#clientmutate)</code> to work with mutations manually.

```typescript
const [result, dispose] = client.manageMutation(mutation, onChange);
```

##### Arguments

| Name     | Type                                                                           | Description                                                                                                                                                    | Required |
| -------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| mutation | <code>[Mutation](#mutation) &#124; undefined</code>                            | A mutation to create a manager for. Pass `undefined` to create an empty manager. It's useful when you can't call the function optionally, e.g. in React Hooks. | Yes      |
| onChange | <code>(result: [MutationManagerResult](#mutationmanagerresult)) => void</code> | A callback that will be called when the state of the manager changes.                                                                                          | Yes      |

##### Return value

| Name    | Type                                                         | Description                                                                                                                                                   |
| ------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| result  | <code>[MutationManagerResult](#mutationmanagerresult)</code> | Current manager state and API for manipulating it.                                                                                                            |
| dispose | <code>() => void</code>                                      | Call it when you don't need the manager anymore to perform the internal cleanup. Note that the ongoing network request will **not** be aborted automatically. |

##### Related types

###### `MutationManagerResult`

> ⚠ Note that mutation manager only tracks the latest mutation execution.

| Name     | Type                                                                | Description                                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| data     | <code>[D](#user-defined-types) &#124; undefined</code>              | The last known data of the mutation, **stored inside the manager**. Note that mutation execution doesn't reset this value.                                                                                                  |
| error    | <code>[E](#user-defined-types) &#124; Error &#124; undefined</code> | The error from the last network request, **stored inside the manager**. Note that mutation execution doesn't reset this value.                                                                                              |
| loading  | <code>boolean</code>                                                | If `true`, there is a network request in progress, **initiated by the manager**.                                                                                                                                            |
| executed | <code>boolean</code>                                                | If `true`, the mutation was executed. Initially it's `false`, and it's switched to `true` after the first call of `execute()`.                                                                                              |
| execute  | <code>() => Promise<[D](#user-defined-types)></code>                | Call it to execute the mutation. Note that the ongoing network request will **not** be aborted automatically.                                                                                                               |
| abort    | <code>() => void</code>                                             | Call it to abort current network request. If there is no network request in progress, it's a no-op.                                                                                                                         |
| reset    | <code>() => void</code>                                             | Call it to reset the manager to the initial (non-executed) state. This will reset `data` and `error` to `undefined` and `executed` to `false`. Note that the ongoing network request will **not** be aborted automatically. |

#### `client.query()`

Execute the query and optionally subscribe to the changes in its state.

```typescript
const result = client.query(query, onChange);
```

##### Arguments

| Name     | Type                                                    | Description                                             | Required |
| -------- | ------------------------------------------------------- | ------------------------------------------------------- | -------- |
| query    | <code>[Query](#query)</code>                            | A query to execute.                                     | Yes      |
| onChange | <code>(state: [QueryState](#querystate)) => void</code> | A callback to call when the state of the query changes. | No       |

##### Return value

###### `QueryResult`

Extends [QueryState](#querystate).

| Name    | Type                                                            | Description                                                                                                                                                                                                    |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| request | <code>Promise<[D](#user-defined-types)> &#124; undefined</code> | A promise representing network request. It will be `undefined`, if it wasn't required (or was required, but wasn't allowed on the server side). Internally, there may be more than one actual network request. |

#### `client.fetchQuery()`

Fetch the query. This method will always lead to a network request. Note that this method respects the `forceRequestOnMerge` option of <code>[Query](#query)</code>.

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

Get state of the given query and optionally subscribe to its changes.

```typescript
const queryState = client.readQuery(query, onChange);
```

##### Arguments

| Name     | Type                                                    | Description                                             | Required |
| -------- | ------------------------------------------------------- | ------------------------------------------------------- | -------- |
| query    | <code>[Query](#query)</code>                            | A query to read.                                        | Yes      |
| onChange | <code>(state: [QueryState](#querystate)) => void</code> | A callback to call when the state of the query changes. | No       |

##### Return value

###### `QueryState`

| Name            | Type                                                                | Description                                                                                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| data            | <code>[D](#user-defined-types) &#124; undefined</code>              | Data from the cache. `undefined` means no data. An unsuccessful request **will not** overwrite this field. It can be thought of as _the last known data_. Always `undefined` for non-cacheable query.                                            |
| error           | <code>[E](#user-defined-types) &#124; Error &#124; undefined</code> | Error from the cache. `undefined` means no error. A successful request **will** overwrite this field to `undefined`. It can be thought of as _the error from the last request_. Always `undefined` for non-cacheable query.                      |
| requestRequired | <code>boolean</code>                                                | Specifies whether a network request is required, based on cache state and fetch policy of the given query. The actual network request may still not be allowed on the server side. If `true`, the query should be rendered with `loading: true`. |
| requestAllowed  | <code>boolean</code>                                                | Specifies whether a network request is allowed. Always `true` on the client side.                                                                                                                                                                |
| cacheable       | <code>boolean</code>                                                | A query is not cacheable, if it has `fetchPolicy: 'no-cache'`.                                                                                                                                                                                   |
| unsubscribe     | <code>() => void &#124; undefined</code>                            | A function for unsubscribing. Will be `undefined` if there was no subscription. It can happen when `onChange` argument wasn't passed, or if the query itself is not cacheable.                                                                   |

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

#### `client.purge()`

Reset the client. Specifically, abort all requests, clear the cache, execute all executed managed queries and reset all managed mutations.

You should call this method on logout.

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

#### `client.hash()`

Get hash of the given value using the `hash` function that was passed to the constructor.

```typescript
const hash = client.hash(value);
```

##### Arguments

| Name  | Type                 | Description      | Required |
| ----- | -------------------- | ---------------- | -------- |
| value | <code>unknown</code> | A value to hash. | Yes      |

##### Return value

<code>string</code>

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

| Name    | Type               | Description       | Required |
| ------- | ------------------ | ----------------- | -------- |
| promise | `Promise<unknown>` | A promise to add. | Yes      |

#### `ssrPromisesManager.awaitPromises()`

Returns a promise that resolves when all added promises are resolved or rejected. Note that you can't use the manager while this promise is pending.

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

| Name              | Type                                                                                                                        | Description                                                                                                                                                                                                      | Required                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| requestParams     | <code>[R](#user-defined-types)</code>                                                                                       | Arbitrary storage of request parameters.                                                                                                                                                                         | Yes                                                     |
| abortSignal       | `AbortSignal`                                                                                                               | Signal for aborting the request.                                                                                                                                                                                 | No                                                      |
| getRequestFactory | <code>(opts: [RequestOptions](#requestoptions)) => (abortSignal?: AbortSignal) => Promise<[D](#user-defined-types)>;</code> | A function that returns the factory for creating network requests.<br/>Note that `abortSignal` for the factory is created by the library. It is **not** the same signal as `abortSignal` field of `BaseRequest`. | No, a rejected promise will be used by default          |
| getRequestId      | <code>(opts: [RequestOptions](#requestoptions)) => string;</code>                                                           | A function for calculating a network request id. It should take some hash from `requestParams`, excluding parts that are different between client and server.                                                    | No, a hash from `requestParams` will be used by default |
| toCache           | <code>(opts: [CacheAndDataOptions](#cacheanddataoptions)) => [C](#user-defined-types);</code>                               | A function that modifies cache data based on request data (from network or optimistic response).                                                                                                                 | No, the cache data will not be modified by default.     |

#### `Query`

Extends [BaseRequest](#baserequest).

| Name                | Type                                                                                             | Description                                                                                                                                                          | Required                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| fetchPolicy         | <code>[FetchPolicy](#fetchpolicy)</code>                                                         | [FetchPolicy](#fetchpolicy).                                                                                                                                         | No, `'cache-only'` is used by default.                       |
| lazy                | `boolean`                                                                                        | If `true`, the query will not be executed automatically.                                                                                                             | No                                                           |
| disableSsr          | `boolean`                                                                                        | If `true`, the query will not be fetched on the server.                                                                                                              | No                                                           |
| optimizeOnHydrate   | `boolean`                                                                                        | If `true`, the query won't be fetched on the client during the hydrate stage, if there is data **or error** in the cache. `fetchPolicy` option is ignored.           | No                                                           |
| forceRequestOnMerge | `boolean`                                                                                        | If `true`, the query will start a new network request, if it's merged with the existing query.                                                                       | No                                                           |
| softAbortSignal     | `AbortSignal`                                                                                    | Soft aborting should be used to indicate loss of interest in the ongoing network request. The actual request won't be aborted if there are other interested parties. | No                                                           |
| fromCache           | <code>(opts: [CacheOptions](#cacheoptions)) => [D](#user-defined-types) &#124; undefined </code> | A function for retrieving query data from cache data.                                                                                                                | No, a function returning `undefined` will be used by default |

#### `Mutation`

Extends [BaseRequest](#baserequest).

| Name                 | Type                                                                                         | Description                                             | Required |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| optimisticData       | <code>[D](#user-defined-types)</code>                                                        | Optimistic data (optimistic response).                  | No       |
| removeOptimisticData | <code>(opts: [CacheAndDataOptions](#cacheanddataoptions)) => [C](#user-defined-types)</code> | A function that removes optimistic data from the cache. | No       |

##### `RequestOptions`

| Name          | Type                                  | Description                              |
| ------------- | ------------------------------------- | ---------------------------------------- |
| requestParams | <code>[R](#user-defined-types)</code> | Arbitrary storage of request parameters. |

##### `CacheOptions`

| Name          | Type                                  | Description                                                                                                 |
| ------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| cacheData     | <code>[C](#user-defined-types)</code> | Cache data.                                                                                                 |
| requestParams | <code>[R](#user-defined-types)</code> | Arbitrary storage of request parameters.                                                                    |
| requestId     | `string`                              | Network request id, generated by the `getRequestId()` function of <code>[BaseRequest](#baserequest)</code>. |

##### `CacheAndDataOptions`

Extends <code>[CacheOptions](#cacheoptions)</code>

| Name | Type                                  | Description                                                      |
| ---- | ------------------------------------- | ---------------------------------------------------------------- |
| data | <code>[D](#user-defined-types)</code> | Data of the given request (from network or optimistic response). |

##### `FetchPolicy`

| `fetchPolicy`         | Query execution result                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'cache-only'`        | No network request. Returns state from the cache.                                                                                                                    |
| `'cache-first'`       | Network request, if there is no data in the cache. Returns state from the cache. The cache is then updated with the request result (if there was a network request). |
| `'cache-and-network'` | Network request regardless of cache state. Returns state from the cache. The cache is then updated with the request result.                                          |
| `'no-cache'`          | Network request regardless of cache state. Does not touch the cache in any way.                                                                                      |

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
