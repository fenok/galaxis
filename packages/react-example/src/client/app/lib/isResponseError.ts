import { ErrorResponse } from './ErrorResponse';
import { ResponseError } from '@fetcher/fetch';

export function isResponseError(
    error: Error | ResponseError<ErrorResponse> | undefined,
): error is ResponseError<ErrorResponse> {
    return Boolean(error && 'response' in error);
}
