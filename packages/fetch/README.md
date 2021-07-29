# Galaxis Fetch

[![npm](https://img.shields.io/npm/v/@galaxis/fetch)](https://www.npmjs.com/package/@galaxis/fetch)

A [Galaxis](/README.md#galaxis-) network interface that uses Fetch API, extended with types and custom body data.

## Installation

```
yarn add @galaxis/fetch
```

You need to install Galaxis [Core](/packages/core#galaxis-core) as well, directly or indirectly.

The library is compiled to modern JS, but it should work in all reasonable browsers with the help of properly configured Babel.

## Public API

> ⚠ Anything that is not documented here is not considered a part of public API and may change at any time.

### `request()`

Returns a `request` function that can be used in query or mutation.

```typescript
const query: AppQuery = {
    requestParams: { foo: 'foo' },
    request: request({ processResponse, root, fetch }),
};
```

#### Arguments

##### `RequestOptions`

| Name            | Type                                                                            | Description                                                                                                                                | Required |
| --------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| processResponse | <code>(response: Response) => [TData](/packages/core#user-defined-types)</code> | A function that takes `Response` and returns request data or throws an error, preferably the <code>[ResponseError](#responseerror)</code>. | Yes      |
| root            | `string`                                                                        | A URL part that is common for all requests, e.g. `'https://jsonplaceholder.typicode.com'`.                                                 | No       |
| fetch           | `typeof fetch`                                                                  | `fetch` function to use instead of built-in `fetch`.                                                                                       | No       |

#### Return value

<code>(resource: [FetchResource](#fetchresource), abortSignal?: AbortSignal) => Promise<[TData](../core#user-defined-types)>;</code>

### `requestId()`

Returns a `requestId` function that can be passed to the <code>[Client](../core#client)</code>. Generates request id in the form of `[url]:[resource-hash]`.

```typescript
const client = new Client({
    cache: new MyCache(),
    requestId: requestId({ hash }),
});
```

#### Arguments

##### `RequestIdOptions`

| Name | Type                                                               | Description                                                                            | Required |
| ---- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | -------- |
| hash | <code>(resource: [FetchResource](#fetchresource)) => string</code> | A function that takes hash from a <code>[FetchResource](#fetchresource)</code> object. | Yes      |

#### Return value

<code>(resource: [FetchResource](#fetchresource)) => string;</code>

### `processResponseJson()`

This function can be used as `processResponse` parameter for the <code>[request()](#request)</code> function.

It expects the `Response` to be in JSON format. If response code is not in 200-299 range, it throws a <code>[ResponseError](#responseerror)</code>.

### `CustomData`

This is an abstract class for representing formats of data that are not natively supported by Fetch API. A `CustomData` instance has the following fields:

| Name        | Type           | Description                                                 |
| ----------- | -------------- | ----------------------------------------------------------- |
| data        | `T`            | Some data.                                                  |
| contentType | `string`       | Value for the `Content-Type` header.                        |
| serialize   | `() => string` | A function that serializes internal `data` field to string. |

### `JsonData`

This class implements <code>[CustomData](#customdata)</code> and allows usage of JSON.

```typescript
const jsonData = new JsonData({ foo: 'foo' });
```

### `ResponseError`

This constructor should be used to throw an error during response processing.

```typescript
throw new ResponseError(response, code, message);
```

#### Arguments

| Name     | Type     | Description                                                    | Required |
| -------- | -------- | -------------------------------------------------------------- | -------- |
| response | `T`      | Some data associated with the response, usually response body. | Yes      |
| code     | `number` | Response code.                                                 | Yes      |
| message  | `string` | Human-readable error message for development purposes.         | No       |

#### Return value

Extends `Error`.

| Name     | Type     | Description                                                    |
| -------- | -------- | -------------------------------------------------------------- |
| name     | `string` | Always has a value of `'ResponseError'`.                       |
| code     | `number` | Response code.                                                 |
| response | `T`      | Some data associated with the response, usually response body. |

### Important types

#### Constraints

| Name              | Type                                                                            | Description       |
| ----------------- | ------------------------------------------------------------------------------- | ----------------- |
| PathConstraint    | <code>Record<string, string &#124; number></code>                               | Path parameters.  |
| QueryConstraint   | <code>[StringifiableRecord](https://www.npmjs.com/package/query-string) </code> | Query parameters. |
| HeadersConstraint | `HeadersInit`                                                                   | Headers.          |
| BodyConstraint    | <code>[CustomData](#customdata)<unknown> &#124; BodyInit &#124; null</code>     | Body.             |

#### `FetchVariablesConstraint`

| Name        | Type                                           | Required |
| ----------- | ---------------------------------------------- | -------- |
| pathParams  | <code>[PathConstraint](#constraints)</code>    | No       |
| queryParams | <code>[QueryConstraint](#constraints)</code>   | No       |
| headers     | <code>[HeadersConstraint](#constraints)</code> | No       |
| body        | <code>[BodyConstraint](#constraints)</code>    | No       |

#### `FetchVariables`

It's a generic that takes the given type `T`, which is constrained by <code>[FetchVariablesConstraint](#fetchvariablesconstraint)</code>, and adds fields from `RequestInit`, omitting `body` and `headers`. `RequestInit` comes from Fetch API.

It describes the part of `resource` that is dynamic. Note how all fields are optional by default.

```typescript
export type FetchVariables<T extends FetchVariablesConstraint = FetchVariablesConstraint> = T &
    Omit<RequestInit, 'body' | 'headers'>;
```

#### `FetchResource`

It's just an intersection of <code>[FetchVariables](#fetchvariables)</code> and <code>[Resource](../core#resource)</code>.

Note that the `name` field (that came from <code>[Resource](../core#resource)</code>) represents the path to the given resource, e.g. `'/entity/:id'`. It is processed by [path-to-regexp](https://www.npmjs.com/package/path-to-regexp).
