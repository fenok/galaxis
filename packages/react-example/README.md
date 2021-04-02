# Fetcher React Example

This example demonstrates usage of queries with SSR. Mutations are not shown, but they are very similar to queries.

The example uses [Fetch](/packages/fetch#fetcher-fetch) as a network interface and [In-Memory Cache](/packages/in-memory-cache#fetcher-in-memory-cache) as a cache. Note that you can use [Redux DevTools](https://github.com/reduxjs/redux-devtools) to observe the cache state.

It also demonstrates how to use the <code>[getParametrizedRequest()](/packages/utils#getparametrizedrequest)</code> utility from [Utils](/packages/utils#fetcher-utils) for convenient queries creation.

Queries are made to [{JSON} Placeholder](https://jsonplaceholder.typicode.com) fake API.

## Run it locally

```
git clone https://github.com/fenok/fetcher.git
cd fetcher
yarn build
yarn workspace @fetcher/react-example start
```

The server should start at `http://localhost:3001`.
