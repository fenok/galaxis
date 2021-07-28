# Galaxis Vue Example

This example demonstrates usage of queries with SSR.

The example uses <code>[Fetch](/packages/fetch#galaxis-fetch)</code> as a network interface and <code>[InMemoryCache](/packages/in-memory-cache#galaxis-in-memory-cache)</code> as a cache. Note that you can use [Redux DevTools](https://github.com/reduxjs/redux-devtools) to observe the cache state.

It also demonstrates how to use the <code>[getParametrizedRequest()](/packages/utils#getparametrizedrequest)</code> utility from [Utils](/packages/utils#galaxis-utils) for convenient queries creation.

Queries are made to [{JSON} Placeholder](https://jsonplaceholder.typicode.com) fake API.

## Run it locally

```
git clone https://github.com/fenok/galaxis.git
cd galaxis
yarn build
yarn workspace @galaxis/vue-example start
```

The server should start at `http://localhost:3001`.
