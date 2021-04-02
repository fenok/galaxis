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

### `getRequestFactory()`

Returns a `getRequestFactory` function that can be used in query or mutation.

```typescript
const query: AppQuery = {
    requestParams: { foo: 'foo' },
    getRequestFactory: getRequestFactory({ processResponse, fetch }),
};
```

#### Arguments

##### `GetRequestFactoryOptions`

| Name            | Type                                                                        | Description                                                                   | Required |
| --------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------- |
| processResponse | <code>(response: Response) => [D](/packages/core#user-defined-types)</code> | A function that takes `Response` and returns request data or throws an error. | Yes      |
| fetch           | `typeof fetch`                                                              | `fetch` function to use instead of built-in `fetch`.                          | No       |

#### Return value

<code>(opts: [RequestOptions](/packages/core#requestoptions)) => (abortSignal?: AbortSignal) => Promise<[D](/packages/core#user-defined-types)>;</code>

### `getRequestId()`

Returns a `getRequestId` function that can be used in query or mutation. Generates request id in the form of `[url]:[request-params-hash]`. Excludes server-specific parts of `requestParams`.

```typescript
const query: AppQuery = {
    requestParams: { foo: 'foo' },
    getRequestId: getRequestId({ hash }),
};
```

#### Arguments

##### `GetRequestIdOptions`

| Name | Type                                    | Description                                      | Required |
| ---- | --------------------------------------- | ------------------------------------------------ | -------- |
| hash | <code>(value: unknown) => string</code> | A function that takes hash from `requestParams`. | Yes      |

#### Return value

<code>(opts: [RequestOptions](/packages/core#requestoptions)) => string;</code>

### `processResponseJson()`

This function can be used as `processResponse` parameter of [getRequestFactory()](#getrequestfactory).

It expects the `Response` to be in JSON format. If response code is not in 200-299 range, it throws a [ResponseError](#responseerror).

### `CustomData`

This is an abstract class for representing formats of data that are not natively supported by Fetch API. A `CustomData` instance has the following fields:

| Name        | Type           | Description                                                 |
| ----------- | -------------- | ----------------------------------------------------------- |
| data        | `T`            | Some data.                                                  |
| contentType | `string`       | Value for the `Content-Type` header.                        |
| serialize   | `() => string` | A function that serializes internal `data` field to string. |

### `JsonData`

This class implements [CustomData](#customdata) and allows usage of JSON.

```typescript
const jsonData = new JsonData({ foo: 'foo' });
```

### `ResponseError`

This error should be thrown in `processResponse` function of [getRequestFactory()](#getrequestfactory).

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

| Name              | Type                                                                        | Description       |
| ----------------- | --------------------------------------------------------------------------- | ----------------- |
| PathConstraint    | <code>Record<string, string &#124; number></code>                           | Path parameters.  |
| QueryConstraint   | [StringifiableRecord](https://www.npmjs.com/package/query-string)           | Query parameters. |
| HeadersConstraint | `HeadersInit`                                                               | Headers.          |
| BodyConstraint    | <code>[CustomData](#customdata)<unknown> &#124; BodyInit &#124; null</code> | Body.             |

#### `RequestParamsConstraint`

| Name        | Type                                           | Required |
| ----------- | ---------------------------------------------- | -------- |
| pathParams  | <code>[PathConstraint](#constraints)</code>    | No       |
| queryParams | <code>[QueryConstraint](#constraints)</code>   | No       |
| headers     | <code>[HeadersConstraint](#constraints)</code> | No       |
| body        | <code>[BodyConstraint](#constraints)</code>    | No       |

#### `DynamicRequestParams`

It's a generic that takes the given type `T`, which is constrained by <code>[RequestParamsConstraint](#requestparamsconstraint)</code>, and adds fields from `RequestInit`, omitting `body` and `headers`. `RequestInit` is from Fetch API.

It describes the part of `requestParams` that is dynamic for the given resource. Note how all fields are optional by default.

```typescript
export type DynamicParams<T extends ParamsConstraint = ParamsConstraint> = T & Omit<RequestInit, 'body' | 'headers'>;
```

#### `GlobalRequestParams`

This type describes `requestParams` that can be specified globally, for all resources. Note how all fields are optional by default.

Extends <code>[DynamicRequestParams](#dynamicrequestparams)</code>.

| Name | Type     | Description                                                                                                             | Required |
| ---- | -------- | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| root | `string` | Url part that is common for all resources, e.g. `'https://domain.com/api'`. May be different between client and server. | No       |

#### `RequestParams`

This type describes `requestParams` for a specific resource. Note how all fields are optional by default, except `path`.

Extends <code>[GlobalRequestParams](#globalrequestparams)</code>.

| Name | Type     | Description                                                                                                                          | Required |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| path | `string` | Path to the given resource, e.g. `'/entity/:id'`. It is processed by [path-to-regexp](https://www.npmjs.com/package/path-to-regexp). | Yes      |
