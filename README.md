# Fetcher 🌌

[![npm](https://img.shields.io/npm/v/react-fetching-hooks)](https://www.npmjs.com/package/react-fetching-hooks)

> ⚠ The library is mostly functional, but there might be slight changes in API until version 1.0.0.

Fetcher is a library for performing network requests. If you were looking for an [Apollo](https://www.apollographql.com/) -like fetching library for non-GraphQL endpoint, this may be the library for you.

Notable features:

-   [High Customizability](packages/core#high-customizability), among other things, lets you use the library for _any_ backend.
-   [Full Server-Side Rendering Support](packages/core#full-server-side-rendering-support) lets you render your data on the server with no additional code.
-   The library [API](packages/core#public-api) is inspired by [Apollo](https://www.apollographql.com/).
-   Requests are separated into [Queries](packages/core#queries) and [Mutations](packages/core#mutations). They can be executed at arbitrary parts of code and points in time, allowing components to express their data requirements in isolation from each other.
-   [Query Merging](packages/core#query-merging) and [Request Queueing](packages/core#request-queueing) ensure network requests deduplication and reasonable [Race Conditions Handling](packages/core#race-conditions-handling).
-   [Optimistic Responses](packages/core#optimistic-responses) for mutations aid in building responsive UI.
-   [Hydrate Stage Optimization](packages/core#hydrate-stage-optimization) prevents double load on the server in case of SSR.
-   Framework agnosticism means that you _should_ be able to integrate the library with your framework. Right now you can use the library with [React](packages/react) and, of course, vanilla JS.

## Examples

-   [React Example](packages/react-example).

## Documentation

-   Framework-agnostic Fetcher [Core](packages/core).
-   Fetcher [React](packages/react) bindings.
-   Common [Utils](packages/utils).
-   Recommended cache: [In-Memory Cache](packages/in-memory-cache).
-   Recommended network interface: [Fetch](packages/fetch).
