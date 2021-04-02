# Galaxis 🌌

[![npm](https://img.shields.io/npm/v/@galaxis/core)](https://www.npmjs.com/package/@galaxis/core)

[Apollo](https://www.apollographql.com)-inspired backend-agnostic fetching library with full SSR support.

> ⚠ The library lacks battle-testing and minor features, but it should be suitable for non-demanding projects.

Notable features:

-   The library [API](packages/core#public-api) is inspired by [Apollo](https://www.apollographql.com/).
-   Requests are separated into [Queries](packages/core#queries) and [Mutations](packages/core#mutations). They can be executed at arbitrary parts of code and points in time, allowing components to express their data requirements in isolation from each other.
-   [Shared Cache](packages/core#shared-cache) enables sharing data between queries and updating it by queries and mutations.
-   [Optimistic Responses](packages/core#optimistic-responses) for mutations aid in building responsive UI.
-   [Query Merging](packages/core#query-merging) and [Request Queueing](packages/core#request-queueing) ensure network requests deduplication and reasonable [Race Conditions Handling](packages/core#race-conditions-handling).
-   [Full Server-Side Rendering Support](packages/core#full-server-side-rendering-support) lets you render your data (and errors!) on the server with no additional code.
-   [Hydrate Stage Optimization](packages/core#hydrate-stage-optimization) prevents double load on the server in case of SSR.
-   [High Customizability](packages/core#high-customizability), among other things, lets you use the library for _any_ backend.
-   Framework agnosticism means that you _should_ be able to integrate the library with your framework. Right now you can use the library with [React](packages/react) and, of course, vanilla JS.

## Examples

-   [React Example](packages/react-example#galaxis-react-example).

## Documentation

-   Framework-agnostic Galaxis [Core](packages/core#galaxis-core).
-   Galaxis [React](packages/react#galaxis-react) bindings.
-   Common [Utils](packages/utils#galaxis-utils).
-   Recommended cache: [In-Memory Cache](packages/in-memory-cache#galaxis-in-memory-cache).
-   Recommended network interface: [Fetch](packages/fetch#galaxis-fetch).
