# Fetcher Utils

This package contains common utils.

## Public API

> ⚠ Anything that is not documented here is not considered a part of public API and may change at any time.

### `getStaticRequest()`

This utility creates a factory that merges provided request (query or mutation) with the request that was passed to the factory.

See [Example of using requests](#example-of-using-requests) for details.

```typescript
const getRequest = getStaticRequest(request, merge);
```

#### Arguments

| Name    | Type                                     | Description                                                                                                                                                                                           | Required |
| ------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| request | <code>REQUEST</code>                     | A complete request (query or mutation).                                                                                                                                                               | Yes      |
| merge   | <code>(r1: R1, r2: R2) => R1 & R2</code> | A function that will merge provided request with the request that was passed to the factory. <code>[mergeDeepNonUndefined()](#mergedeepnonundefined)</code> should work for a vast majority of cases. | Yes      |

#### Return value

`(request: Partial<REQUEST>) => REQUEST`

### `getParametrizedRequest()`

This utility is similar to <code>[getStaticRequest](#getstaticrequest)</code>, but it's useful when you can't describe complete query or mutation statically. In that case, you provide a factory for creating one instead.

See [Example of using requests](#example-of-using-requests) for details.

```typescript
const getRequest = getParametrizedRequest(factory, merge);
```

#### Arguments

| Name    | Type                                     | Description                                                                                                                                                                                           | Required |
| ------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| factory | <code>(params: P) => REQUEST</code>      | A factory for creating a request based on `requestParams` field of the passed request.                                                                                                                | Yes      |
| merge   | <code>(r1: R1, r2: R2) => R1 & R2</code> | A function that will merge the request from the factory with the rest of the passed request. <code>[mergeDeepNonUndefined()](#mergedeepnonundefined)</code> should work for a vast majority of cases. | Yes      |

#### Return value

<code>(request: Omit<REQUEST, 'requestParams'> & { requestParams: P }) => REQUEST</code>

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

| Name    | Type                                                                                         | Description                                                                              | Required |
| ------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| toCache | <code>(opts: [CacheAndDataOptions](../../packages/core#cacheanddataoptions)) => void;</code> | A function like normal `toCache`, but the `cacheData` parameter can be updated directly. | Yes      |

#### Return value

<code>(opts: [CacheAndDataOptions](../../packages/core#cacheanddataoptions)) => [C](../../packages/core#user-defined-types);</code>

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

| Name      | Type                                                                                                                                   | Description                                                                                                                                                                                                                                           | Required |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| fromCache | <code>(opts: [CacheOptions](../../packages/core#cacheoptions)) => [D](../../packages/core#user-defined-types) &#124; undefined </code> | A normal `fromCache` function.                                                                                                                                                                                                                        | Yes      |
| getDeps   | <code>(opts: [CacheOptions](../../packages/core#cacheoptions)) => unknown[] </code>                                                    | A function that returns the parts of `cacheData` that this `fromCache` depends on. These dependencies are compared by reference. The new value will be calculated only if some dependency changes. Note that the length of dependencies can't change. | Yes      |

#### Return value

<code>(opts: [CacheOptions](../../packages/core#cacheoptions)) => [D](../../packages/core#user-defined-types) &#124; undefined </code>

### `mergeDeepNonUndefined()`

It's a small wrapper for [lodash.merge](https://lodash.com/docs/4.17.15#merge). The only difference is that it doesn't mutate arguments.

### `objectHash()`

It's the [object-hash](https://www.npmjs.com/package/object-hash) without any changes.

## Example of using requests

> ⚠ The example focuses on Query, but it's all the same for Mutation.

Let's say we got the following types, specific to the network interface we're using:

```typescript
// Params that can change for the given resource
export interface DynamicParams {
    vars?: Record<string, string>;
}

// Params that are static for the given resource
export interface StaticParams {
    path: string;
}

// We use a generic to have the ability to type DynamicParams better
export type Params<T extends DynamicParams = DynamicParams> = StaticParams & T;
```

We can define the creators of parametrized queries once in the application:

```typescript
import { getParametrizedRequest, getStaticRequest, mergeDeepNonUndefined } from '@fetcher/utils';
import { DynamicParams, Params } from 'some-network-interface';
import { CacheData } from './path/to/cache';

export type AppQuery<D extends NonUndefined, R extends DynamicParams = DynamicParams> = Query<
    CacheData,
    D,
    Error,
    Params<R>
>;

export function getQuery<D extends NonUndefined, R extends DynamicParams = DynamicParams, P = R>(
    factory: (params: P) => AppQuery<D, R>,
) {
    return getParametrizedRequest(factory, mergeDeepNonUndefined);
}

export function getStaticQuery<D extends NonUndefined, R extends DynamicParams = DynamicParams>(query: AppQuery<D, R>) {
    return getStaticRequest(query, mergeDeepNonUndefined);
}
```

Then use it like this:

```typescript
import { getQuery } from './path/to/getQuery';
import { client } from './path/to/client';

interface MyQueryData {
    someField: string;
}

const myQuery = getQuery<MyQueryData>((params) => ({
    // Existence of 'requestParams' is checked, typed as Params
    requestParams: {
        path: '/resource', // Existence of 'path' is checked
        ...params, // Params are just DynamicParams
    },
    fetchPolicy: 'cache-and-network', // We can optionally specify other Query fields
}));

client
    .fetchQuery(
        myQuery({
            // Existence of 'requestParams' is checked, typed as DynamicParams
            requestParams: {
                vars: { foo: 'foo' },
            },
            fetchPolicy: 'cache-first', // We can optionally override other Query fields
        }),
    )
    .then((data) => console.log(data)); // 'data' is typed as MyQueryData
```

We can type dynamic params better:

```typescript
import { getQuery } from './path/to/getQuery';
import { client } from './path/to/client';

interface MyQueryData {
    someField: string;
}

interface MyQueryParams {
    vars: {
        foo: string;
        bar: string;
    };
}

const myQuery = getQuery<MyQueryData, MyQueryParams>((params) => ({
    // Existence of 'requestParams' is checked, typed as Params<MyQueryParams>
    requestParams: {
        path: '/resource', // Existence of 'path' is checked
        ...params, // Params are MyQueryParams
    },
    fetchPolicy: 'cache-and-network', // We can optionally specify other Query fields
}));

client
    .fetchQuery(
        myQuery({
            // Existence of 'requestParams' is checked, typed as MyQueryParams
            requestParams: {
                vars: { foo: 'foo', bar: 'bar' },
            },
            fetchPolicy: 'cache-first', // We can optionally override other Query fields
        }),
    )
    .then((data) => console.log(data)); // 'data' is typed as MyQueryData
```

We can go even further and allow ourselves to partially specify dynamic params:

```typescript
import { getQuery } from './path/to/getQuery';
import { client } from './path/to/client';

interface MyQueryData {
    someField: string;
}

interface MyQueryParams {
    vars: {
        foo: string;
        bar: string;
    };
}

interface MyQueryCustomParams {
    foo: string;
}

const myQuery = getQuery<MyQueryData, MyQueryParams, MyQueryCustomParams>((params) => ({
    // Existence of 'requestParams' is checked, typed as Params<MyQueryParams>
    requestParams: {
        path: '/resource', // Existence of 'path' is checked
        vars: {
            foo: params.foo, // Params are MyQueryCustomParams
            bar: 'bar',
        },
    },
    fetchPolicy: 'cache-and-network', // We can optionally specify other Query fields
}));

client
    .fetchQuery(
        myQuery({
            requestParams: { foo: 'foo' }, // Existence of 'requestParams' is checked, typed as MyQueryCustomParams
            fetchPolicy: 'cache-first', // We can optionally override other Query fields
        }),
    )
    .then((data) => console.log(data)); // 'data' is typed as MyQueryData
```

Finally, if our query is static:

```typescript
import { getStaticQuery } from './path/to/getQuery';
import { client } from './path/to/client';

interface MyQueryData {
    someField: string;
}

interface MyQueryParams {
    vars: {
        foo: string;
        bar: string;
    };
}

const myQuery = getStaticQuery<MyQueryData, MyQueryParams>({
    // Existence of 'requestParams' is checked, typed as Params<MyQueryParams>
    requestParams: {
        path: '/resource',
        vars: {
            foo: 'foo',
            bar: 'bar',
        },
    },
    fetchPolicy: 'cache-and-network', // We can optionally specify other Query fields
});

client
    .fetchQuery(
        myQuery({
            // We could override 'requestParams' as well
            fetchPolicy: 'cache-first', // We can optionally override other Query fields
        }),
    )
    .then((data) => console.log(data)); // 'data' is typed as MyQueryData
```
