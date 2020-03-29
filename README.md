# React Fetching Hooks

[![npm](https://img.shields.io/npm/v/react-fetching-hooks)](https://www.npmjs.com/package/react-fetching-hooks)

> ⚠ This library is work-in-progress and published only for some real-life testing. Expect bugs, documentation inconsistency and breaking changes on every release until version 1.0.0.

Library for querying and mutating data in apollo-like way for any backend (GraphQL-based ones should just use Apollo instead, obviously).

-   Full SSR support
    -   With requests on server
    -   NOT tied to Next.js
-   Apollo-like caching
    -   Fetch policies (NOT identical to Apollo): `cache-only`, `cache-first`, `cache-and-network`, `no-cache`
    -   Single shared cache, allowing data updates across components with different queries, returning the same data
    -   Errors are cached
    -   Integration with redux-devtools
-   Network requests optimization and race conditions handling
    -   The same queries from different components are merged into single network request
    -   Mutation updates all queries in progress, so older state never overwrites newer one
    -   If no one needs network request's data, it's cancelled
-   Simple and customizable
    -   Customise requests globally or on per-request basis
-   Tree-shakable (ES6 modules): use only what you need
-   Written in typescript

## Quick start (no SSR)

Assuming you have a local API on port 3001, returning a JSON of (`{field: 'string-data'}`) with status 2xx from `/data/:id`.

First you'll need to create a client.

```typescript
import { Client, Cache, getIdUrl, getUrlDefault, mergeShallow, processResponseRestfulJson } from 'react-fetching-hooks';

const client = new Client({
    cache: new Cache(),
    generalRequestData: {
        root: 'http://localhost:3001', // Backend host
        fetchPolicy: 'cache-and-network',
        getId: getIdUrl,
        getUrl: getUrlDefault,
        merge: mergeShallow,
        processResponse: processResponseRestfulJson,
    },
});
```

Then you'll need to provide that client to your app via `Provider`.

```typescript jsx
import { Provider } from 'react-fetching-hooks';
import React, { FC } from 'react';

const App: FC = () => <Provider client={client}>Your app</Provider>;
```

Then you'll be able to perform queries and mutations in concrete components.

```typescript jsx
import React, { FC } from 'react';
import { PartialRequestData, useQuery } from 'react-fetching-hooks';

interface Props {
    id: string;
}

interface DataResponse {
    field: string;
}

const dataRequest: PartialRequestData<any, DataResponse, { id: string }> = {
    pathParams: { id: '1' },
    path: '/data/:id',
};

const DataDisplay: FC<Props> = ({ id }) => {
    const { data } = useQuery({ ...dataRequest, pathParams: { id } });

    return <div>{data}</div>;
};
```

## SSR example

On server:

```typescript jsx
import { getDataFromTree, Client } from 'react-fetching-hooks';
import {renderToString} from 'react-dom/server';

...

// In request handler:

// Pass fetch, because there is no one in Node
const client = new Client({ fetch, ... });

// App must provide the client via Provider
const AppElement = React.createElement(App, { client });

// Fill cache with data/errors
await getDataFromTree(AppElement);

// Get HTML to send
const content = renderToString(AppElement);

// Get data/errors as string to send
const cacheAsString = JSON.stringify(client.extract());
```

On client:

```typescript jsx
import { Cache } from 'react-fetching-hooks';

// Assuming window.__RFH_CACHE__ contains cache data from server
const cache = new Cache(window.__RFH_CACHE__);

// Pass cache to Client instance and render with server data
```

## In-depth

### RequestData

Requests are represented as `RequestData` objects. Due to flexibility, `RequestData` isn't a class, but rather a type defining a specific shape.

`RequestData` is native fetch's `RequestInit` with additional fields:

-   `fetchPolicy` - see specific section.
-   `root` - backend host, like `https://my-app.com`. Must be absolute on server, may be relative on client. Will be processed by `getUrl` function.
-   `path` - like `/data/:id`. Will be processed by `getUrl` function.
-   `pathParams` - object of params in path, like `{id: "1"}`. Will be processed by `getUrl` function.
-   `queryParams` - object of params in query. Will be processed by `getUrl` function.
-   `getUrl` - function for generating request's URL.
-   `getId` - function for generating requests's id. Obvious, but important: requests with the same id are considered the same.
-   `processResponse` - function that returns data or throws an error based on request's `Response` (native).
-   `merge` - function that merges `RequestData` objects together.
-   `toCache`, `fromCache` - functions for writing data to and reading data from cache.

All required fields (except `path`) are defined on `Client` instance as `generalRequestData` (essentially they're default values for every request). The only required field of concrete request is `path`.

Every field may be configured either globally on `Client` instance or on concrete request (or right before passing concrete request to react hook).

Concrete requests should be defined as objects of type `PartialRequestData<SharedData, ResponseData, PathParams, QueryParams, Body>`, where

-   `SharedData` - same for every request, type of shared cache
-   `ResponseData` - type of successful response's data

### Request functions

All functions are replaceable. The library provides default/example ones:

-   `getIdUrl` - returns URL as id.
-   `getUrlDefault` - returns URL, using `query-string` and `path-to-regexp` packages. If you don't want to include them, you can provide your own function and they will be tree-shaked.
-   `mergeShallow` - merges `RequestData` objects shallowly.
-   `processResponseRestfulJson` - assumes that 2xx response is successful (and returns JSON), throws `ResponseError` on non-2xx response.

### Cache

Cache is responsible for storing all cacheable data.

Cache consists of two parts: `requestStates` and `sharedData`.

`requestStates` stores states of every individual request by its id. Request state consists of:

-   `data` - result of successful request from `processResponse` function.
-   `loading` - boolean
-   `error` - serialized `Error` thrown from `processResponse` function.

`requestStates` is for internal usage only.

`sharedData` stores data from `processResponse` function, normalized by `toCache` function (from all requests). Shape of `sharedData` is completely up to you, but generally it should be as normalized and deduplicated as possible.

If request result updates `sharedData`, `data` field in `requestStates` is set to `undefined` to prevent duplication.

Cache options (all optional):

-   `initialState` - object that will be used for cache initialization (both `requestStates` and `sharedData`). You can provide SSR result here. Defaults to empty cache.
-   `enableDevTools` - enable redux-devtools bindings. Defaults to `false`.
-   `enableDataDuplication` - if `true`, `data` field in `requestStates` will always be set. Defaults to `false`.

### Client

Client is responsible for performing requests. It also proxies cache (you should't work with cache directly).

On retrieving data from cache `fromCache` function is prioritized over `data` field from request state from `requestStates`.

You must provide new `Client` instance for every request in case of SSR.

Due to tree-shakeable design, you have to specify all parts of `generalRequestData` manually.

### Queries and mutations

Queries and mutations use the same `RequestData` objects.

Rule of thumb: if a request doesn't change any backend state by the fact of its execution, it's a query. Otherwise, it's a mutation.

I.e. request, returning current time, is query, even though it returns new data every time.

### Queries processing

If some query is loading, and another caller (component) executes the same query (using `RequestData` with the same id), this query is seamlessly merged with the first one, as if they were started simultaneously. This two queries will result in single network request.

#### Abort

Queries can be merged indefinitely. In other words, each network request can have unlimited number of callers (components). Aborting such requests is treated as follows:

-   caller (component) can call `abort()` without arguments. If there are any other callers, the request won't be aborted and the call essentially will be a no-op.
-   caller (component) can call `abort(true)`. That will force abort for all callers.

#### Retry

`retry()` call always starts new network request for all callers.

#### Caching

Queries are always cached in `requestStates`. If `toCache` is provided, the query will also be cached to `sharedData`.

### Mutation processing

When mutation completes, all loading queries are forced to rerun network request, so older data won't overwrite newer one. Mutation result is never cached to `requestStates`, but it will be cached to `sharedData`, if `toCache` is provided.

### Fetch policies

Queries:

-   `cache-only` - never makes network request. Returns data from cache or `undefined`.
-   `cache-first` - only makes network request, if there is no data in cache. Returns data from cache or `undefined` and then data/error from network, if there was network request.
-   `cache-and-network` - always makes network request. Returns data or `undefined` from cache and data/error from network.
-   `no-cache` - always makes network request. Returns data or `undefined` from cache and data/error from network. It's cached on per-caller basis and never touches `sharedData`, so initially it always returns `undefined`.

Mutations:

-   `cache-only`, `cache-first`, `cache-and-network` - returns data/error and updates `sharedData`
-   `no-cache` - returns data/error without touching `sharedData`

## Known issues

-   Errors in external code may lead to different errors in state and `query().catch()`;
