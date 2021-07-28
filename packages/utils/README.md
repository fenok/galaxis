# Galaxis Utils

[![npm](https://img.shields.io/npm/v/@galaxis/utils)](https://www.npmjs.com/package/@galaxis/utils)

Common [Galaxis](/README.md#galaxis-) utils.

## Installation

```
yarn add @galaxis/utils
```

You need to install Galaxis [Core](/packages/core#galaxis-core) as well, directly or indirectly.

The library is compiled to modern JS, but it should work in all reasonable browsers with the help of properly configured Babel.

## Public API

> ⚠ Anything that is not documented here is not considered a part of public API and may change at any time.

### `immerify()`

This utility simplifies cache updates using [Immer](https://www.npmjs.com/package/immer). With it, you can just update `cacheData` without worrying about immutability.

```typescript
const query: AppQuery = {
    requestParams: { foo: 'foo' },
    toCache: immerify(({ cacheData, data }) => {
        cacheData.field = data;
    }),
};
```

#### Arguments

| Name    | Type                                                                          | Description                                                                              | Required |
| ------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| toCache | <code>(opts: [ToCacheOptions](/packages/core#tocacheoptions)) => void;</code> | A function like normal `toCache`, but the `cacheData` parameter can be updated directly. | Yes      |

#### Return value

<code>(opts: [ToCacheOptions](/packages/core#tocacheoptions)) => [TCacheData](/packages/core#user-defined-types);</code>

### `memoize()`

This utility helps with memoization of data, that is calculated based on the cache data.

```typescript
const query: AppQuery = {
    requestParams: { id: '1' },
    fromCache: memoize(
        ({ cacheData, requestParams }) => {
            const firstDataPiece = cacheData.first[requestParams.id];
            const secondDataPiece = cacheData.second[requestParams.id];

            return firstDataPiece && secondDataPiece ? { ...firstDataPiece, ...secondDataPiece } : undefined;
        },
        ({ cacheData, requestParams }) => [cacheData.first[requestParams.id], cacheData.second[requestParams.id]],
    ),
};
```

#### Arguments

| Name      | Type                                                                                                                                     | Description                                                                                                                                                                                                                                           | Required |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| fromCache | <code>(opts: [FromCacheOptions](/packages/core#fromcacheoptions)) => [TData](/packages/core#user-defined-types) &#124; undefined </code> | A normal `fromCache` function.                                                                                                                                                                                                                        | Yes      |
| getDeps   | <code>(opts: [FromCacheOptions](/packages/core#fromcacheoptions)) => unknown[] </code>                                                   | A function that returns the parts of `cacheData` that this `fromCache` depends on. These dependencies are compared by reference. The new value will be calculated only if some dependency changes. Note that the length of dependencies can't change. | Yes      |

#### Return value

<code>(opts: [FromCacheOptions](/packages/core#fromcacheoptions)) => [TData](/packages/core#user-defined-types) &#124; undefined </code>

### `objectHash()`

It's the [object-hash](https://www.npmjs.com/package/object-hash) without any changes.
