# Fetcher: In-memory cache

In-memory cache implements <code>[Cache](../../packages/core#cache)</code> and allows to watch its state via [Redux DevTools](https://github.com/reduxjs/redux-devtools).

## Public API

> ⚠ Anything that is not documented here is not considered a part of public API and may change at any time.

### `InMemoryCache`

```typescript
const inMemoryCache = new InMemoryCache({ emptyData, initialState, enableDevTools });
```

##### Arguments

| Name           | Type                                                                                                                                               | Description                                                                         | Required |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------- |
| emptyData      | <code>[C](../../packages/core#user-defined-types)</code>                                                                                           | A value that conforms to `C`, that is considered to be empty. E.g. `{entities: {}}` | Yes      |
| initialState   | <code>[CacheState](#cachestate)<[C](../../packages/core#user-defined-types), [ErrorObject](https://www.npmjs.com/package/serialize-error) ></code> | A value from <code>[cache.extract()](#cacheextract)</code>, most likely from SSR.   | No       |
| enableDevTools | `boolean`                                                                                                                                          | Enable Redux DevTools integration.                                                  | No       |

#### `cache.extract()`

Returns the cache state in serializable form. Uses [serialize-error](https://www.npmjs.com/package/serialize-error) to convert errors into serializable objects.

```typescript
const state = cache.extract();
```

##### Return value

<code>[CacheState](#cachestate)<[C](../../packages/core#user-defined-types), [ErrorObject](https://www.npmjs.com/package/serialize-error) ></code>

### Important types

#### `CacheState`

Internal state of the cache.

| Name   | Type                                                     | Description                               |
| ------ | -------------------------------------------------------- | ----------------------------------------- |
| data   | <code>[C](../../packages/core#user-defined-types)</code> | Cache data.                               |
| errors | <code>Record<string, E &#124; undefined></code>          | Cached errors. `E` is `Error` by default. |
