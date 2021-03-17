# Fetcher 🌌

[![npm](https://img.shields.io/npm/v/react-fetching-hooks)](https://www.npmjs.com/package/react-fetching-hooks)

> ⚠ The library is mostly functional, but there might be slight changes in API until version 1.0.0.

Fetcher is a library for performing network requests. It focuses on high customizability, ease of use and full SSR support.

Fetcher API is inspired by [Apollo](https://www.apollographql.com/). If you were looking for Apollo-like fetching library, this may be the library for you.

## Features

### Queries

Queries are requests that **do not** change the system state. They are described as <code>[BaseQuery](packages/core#basequery)</code> objects.

### Mutations

Mutations are requests that **do** change the system state. They are described as <code>[BaseMutation](packages/core#basemutation)</code> objects.

### Fetch Policies

You must specify query `fetchPolicy` to indicate how this query should be updated.

| `fetchPolicy`         | Query execution result                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'cache-only'`        | No network request. Returns state from the cache.                                                                                                                    |
| `'cache-first'`       | Network request, if there is no data in the cache. Returns state from the cache. The cache is then updated with the request result (if there was a network request). |
| `'cache-and-network'` | Network request regardless of cache state. Returns state from the cache. The cache is then updated with the request result.                                          |
| `'no-cache'`          | Network request regardless of cache state. Does not touch the cache in any way.                                                                                      |

### Query merging

The library encourages executing queries at arbitrary parts of code and points in time. This way, any component of the application can express its data requirements in isolation from other components.

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

### Great customization capabilities

The library is completely unopinionated about the network level. You can use fetch, axios, XMLHttpRequest, or any other solution. You can add network requests logging, retries, or timeouts. See [BaseRequest](packages/core#baserequest) for details.

The library is also unopinionated about [Cache](packages/core#cache) internals. You can add cache persistence, partial or complete. You even should be able to integrate the cache with your own state management solution, should you need so.
