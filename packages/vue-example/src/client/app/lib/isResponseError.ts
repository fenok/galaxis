import { ErrorResponse } from './ErrorResponse';
import { ResponseError } from '@galaxis/fetch';

export function isResponseError(
    error: Error | ResponseError<ErrorResponse> | undefined,
): error is ResponseError<ErrorResponse> {
    return error?.name === 'ResponseError';
}
