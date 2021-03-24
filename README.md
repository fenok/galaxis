# Fetcher 🌌

[![npm](https://img.shields.io/npm/v/react-fetching-hooks)](https://www.npmjs.com/package/react-fetching-hooks)

> ⚠ The library is mostly functional, but there might be slight changes in API until version 1.0.0.

Fetcher is a library for performing network requests. It focuses on [high customizability](packages/core#great-customization-capabilities), ease of use and [full SSR support](packages/core#server-side-rendering).

Fetcher API is inspired by [Apollo](https://www.apollographql.com/). If you were looking for Apollo-like fetching library for non-GraphQL endpoint, this may be the library for you.

Requests are separated into [Queries](packages/core#queries) and [Mutations](packages/core#mutations). They can be executed at arbitrary parts of code and points in time, allowing components to express their data requirements in isolation from each other.

Network requests are deduplicated thanks to [Query Merging](packages/core#query-merging), and [Request Queueing](packages/core#request-queueing), alongside other techniques, makes sure there are no race conditions.

There are [Optimistic Responses](packages/core#optimistic-responses) for mutations.

In case of SSR, double load on the server is prevented by [Hydrate Stage Optimization](packages/core#hydrate-stage-optimization).

## Show me the code

Proceed to [React Example](packages/react-example).

## Documentation

-   Framework-agnostic Fetcher [Core](packages/core).
-   Fetcher [React](packages/react) bindings.
-   Common [Utils](packages/utils).
-   Recommended cache: [InMemoryCache](packages/in-memory-cache).
-   Recommended network interface: [Typed Fetch Request](packages/typed-fetch-request).
